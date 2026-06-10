from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import uvicorn
from datetime import datetime

app = FastAPI(title="FocusFlow ML Prediction Service", version="1.0.0")

class SessionHistoryItem(BaseModel):
    startTime: str
    duration: float  # in seconds
    completed: bool
    interruptions: int
    pauseCount: int

class PredictionRequest(BaseModel):
    sleep_time: str
    wake_up_time: str
    session_duration: int  # in minutes
    distractions_count: int
    energy_level: int  # 1-10
    history: List[SessionHistoryItem]
    # Telemetry Spends
    productive_time_weekly: Optional[float] = 0.0
    distracting_time_weekly: Optional[float] = 0.0
    neutral_time_weekly: Optional[float] = 0.0
    productive_time_monthly: Optional[float] = 0.0
    distracting_time_monthly: Optional[float] = 0.0
    neutral_time_monthly: Optional[float] = 0.0

def time_to_mins(time_str: str) -> int:
    try:
        h, m = map(int, time_str.split(":"))
        return h * 60 + m
    except:
        return 0

# Helper: Generate synthetic baseline student dataset for cold-start training
def generate_synthetic_data(sleep_time: str, wake_up_time: str):
    np.random.seed(42)
    n_samples = 300
    
    sleep_mins = time_to_mins(sleep_time)
    wake_mins = time_to_mins(wake_up_time)
    
    # Features
    session_durations = np.random.choice([25, 45, 60, 90], size=n_samples)
    study_hours = np.random.randint(0, 24, size=n_samples)
    distractions = np.random.randint(0, 6, size=n_samples)
    energy_levels = np.random.randint(1, 11, size=n_samples)
    
    completed = []
    burnout_risks = []
    
    for i in range(n_samples):
        dur = session_durations[i]
        hr = study_hours[i]
        dist = distractions[i]
        en = energy_levels[i]
        
        study_mins = hr * 60
        
        # Rule 1: Sleep hours overlap -> very low completion
        is_sleeping = False
        if sleep_mins > wake_mins:
            is_sleeping = (study_mins >= sleep_mins or study_mins < wake_mins)
        else:
            is_sleeping = (sleep_mins <= study_mins < wake_mins)
            
        prob = 0.85
        if is_sleeping:
            prob -= 0.65
        
        # Rule 2: High duration -> lower completion
        if dur >= 60:
            prob -= 0.15
        if dur >= 90:
            prob -= 0.25
            
        # Rule 3: Distractions & Energy
        prob -= dist * 0.08
        prob += (en - 5) * 0.04
        
        prob = np.clip(prob, 0.05, 0.95)
        comp = np.random.choice([1, 0], p=[prob, 1 - prob])
        completed.append(comp)
        
        # Burnout risk calculation: high study volume + high distractions/pauses
        risk = (dur / 90.0) * 0.3 + (dist / 5.0) * 0.2 + (1.0 - (en / 10.0)) * 0.3
        if comp == 0:
            risk += 0.2
        burnout_risks.append(np.clip(risk, 0.0, 1.0))
        
    df = pd.DataFrame({
        "session_duration": session_durations,
        "study_hour": study_hours,
        "distractions_count": distractions,
        "energy_level": energy_levels,
        "completed": completed,
        "burnout_risk": burnout_risks
    })
    return df

@app.get("/")
def read_root():
    return {"status": "FocusFlow ML Service Online"}

@app.post("/predict")
def predict_focus(req: PredictionRequest):
    try:
        # 1. Load baseline synthetic dataset
        df = generate_synthetic_data(req.sleep_time, req.wake_up_time)
        
        # 2. Append actual session history if available to customize model
        if len(req.history) > 0:
            hist_rows = []
            for item in req.history:
                try:
                    dt = datetime.fromisoformat(item.startTime.replace("Z", "+00:00"))
                    hr = dt.hour
                except:
                    hr = 18 # fallback
                    
                hist_rows.append({
                    "session_duration": int(item.duration / 60),
                    "study_hour": hr,
                    "distractions_count": item.interruptions,
                    # Fallback approximation for history energy levels
                    "energy_level": req.energy_level if item.completed else max(1, req.energy_level - 3),
                    "completed": 1 if item.completed else 0,
                    "burnout_risk": 0.1 + (item.interruptions * 0.15) + (item.pauseCount * 0.1)
                })
            df_hist = pd.DataFrame(hist_rows)
            # Mix datasets (repeat history items to give them higher weight in training)
            df = pd.concat([df, df_hist, df_hist], ignore_index=True)

        # 3. Train models
        X = df[["session_duration", "study_hour", "distractions_count", "energy_level"]]
        y_class = df["completed"]
        y_reg = df["burnout_risk"]

        clf = RandomForestClassifier(n_estimators=50, random_state=42)
        clf.fit(X, y_class)

        reg = RandomForestRegressor(n_estimators=50, random_state=42)
        reg.fit(X, y_reg)

        # 4. Predict for current profile parameters
        # Evaluate multiple possible study hours to find best slot
        possible_hours = [7, 10, 15, 20] # Morning, Afternoon, Evening, Night indicators
        hour_labels = {7: "Morning", 10: "Afternoon", 15: "Evening", 20: "Night"}
        best_prob = -1.0
        best_hour = 20

        for hr in possible_hours:
            feat = np.array([[req.session_duration, hr, req.distractions_count, req.energy_level]])
            prob = clf.predict_proba(feat)[0][1]
            if prob > best_prob:
                best_prob = prob
                best_hour = hr

        # Predict current probability & risk
        # Find average study hour
        current_study_hour = 19 # 7:00 PM default
        if len(req.history) > 0:
            try:
                current_study_hour = datetime.fromisoformat(req.history[0].startTime.replace("Z", "+00:00")).hour
            except:
                pass

        current_feat = np.array([[req.session_duration, current_study_hour, req.distractions_count, req.energy_level]])
        completion_prob = float(clf.predict_proba(current_feat)[0][1])
        burnout_risk_score = float(reg.predict(current_feat)[0])

        # Integrate telemetry parameters into the mathematical predictions
        total_weekly_time = req.productive_time_weekly + req.distracting_time_weekly + req.neutral_time_weekly
        if total_weekly_time > 0:
            distraction_ratio = req.distracting_time_weekly / total_weekly_time
            completion_prob -= distraction_ratio * 0.25
            burnout_risk_score += distraction_ratio * 0.20 + (total_weekly_time / 360000.0) * 0.10

        completion_prob = np.clip(completion_prob, 0.05, 0.95)
        burnout_risk_score = np.clip(burnout_risk_score, 0.0, 1.0)

        # Optimize preferred session duration
        durations = [25, 45, 60, 90]
        best_dur_prob = -1.0
        recommended_dur = 25
        for d in durations:
            feat = np.array([[d, current_study_hour, req.distractions_count, req.energy_level]])
            prob = clf.predict_proba(feat)[0][1]
            if prob > best_dur_prob:
                best_dur_prob = prob
                recommended_dur = d

        # Confidence rating is proportional to history size
        confidence = float(np.clip(0.5 + (len(req.history) * 0.05), 0.5, 0.95))

        # Generate personalized AI Tips
        tips = []
        prod_w_min = req.productive_time_weekly / 60
        dist_w_min = req.distracting_time_weekly / 60

        if dist_w_min > prod_w_min and dist_w_min > 0:
            tips.append("Distraction ratio alert: You spent more time on distracting sites than productive platforms this week. Lock down those sites!")
        elif prod_w_min > 120:
            tips.append("Awesome focus! Your productive coding/study web activity has surpassed 2 hours this week.")

        if dist_w_min > 180:
            tips.append(f"Weekly Warning: You spent {round(dist_w_min/60, 1)}h on YouTube/Social Media. Consider blocking these during slots.")

        if req.energy_level < 5:
            tips.append("Low energy detected. Consider breaking study sessions into shorter 25m Pomodoro slots.")
        elif req.energy_level >= 8 and req.session_duration < 45:
            tips.append("High energy! Consider increasing focus slots to 45m or 60m blocks to make deeper progress.")

        if len(tips) == 0:
            tips.append("Observe your schedule, turn off notifications, and keep your companion extension running.")

        return {
            "completion_probability": round(completion_prob, 2),
            "recommended_session_duration": recommended_dur,
            "burnout_risk": round(burnout_risk_score, 2),
            "best_study_slot": hour_labels[best_hour],
            "confidence_score": round(confidence, 2),
            "tips": tips
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Prediction Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
