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
    user_id: Optional[str] = "default"
    retrain: Optional[bool] = False
    critical_tasks_count: Optional[int] = 0
    high_tasks_count: Optional[int] = 0
    medium_tasks_count: Optional[int] = 0
    low_tasks_count: Optional[int] = 0
    due_soon_tasks_count: Optional[int] = 0
    # Telemetry Spends
    productive_time_weekly: Optional[float] = 0.0
    distracting_time_weekly: Optional[float] = 0.0
    neutral_time_weekly: Optional[float] = 0.0
    productive_time_monthly: Optional[float] = 0.0
    distracting_time_monthly: Optional[float] = 0.0
    neutral_time_monthly: Optional[float] = 0.0
    pod_size: Optional[int] = 1
    pod_sprint_active: Optional[bool] = False

# Global cache to hold fitted RandomForestClassifier and RandomForestRegressor models per user
model_cache = {}

def time_to_mins(time_str: str) -> int:
    try:
        h, m = map(int, time_str.split(":"))
        return h * 60 + m
    except:
        return 0

# Helper: Generate synthetic baseline student dataset for cold-start training
def generate_synthetic_data(
    sleep_time: str,
    wake_up_time: str,
    critical_tasks: int = 0,
    high_tasks: int = 0,
    medium_tasks: int = 0,
    low_tasks: int = 0,
    due_soon_tasks: int = 0,
    avg_interruptions: float = 0.5,
    avg_pauses: float = 0.3
):
    np.random.seed(42)
    n_samples = 300
    
    sleep_mins = time_to_mins(sleep_time)
    wake_mins = time_to_mins(wake_up_time)
    
    # Features
    session_durations = np.random.choice([25, 45, 60, 90], size=n_samples)
    study_hours = np.random.randint(0, 24, size=n_samples)
    distractions = np.random.randint(0, 6, size=n_samples)
    energy_levels = np.random.randint(1, 11, size=n_samples)
    
    # Workload Poisson distributions centered around user's current counts
    criticals = np.random.poisson(lam=max(0, critical_tasks), size=n_samples)
    highs = np.random.poisson(lam=max(0, high_tasks), size=n_samples)
    mediums = np.random.poisson(lam=max(0, medium_tasks), size=n_samples)
    lows = np.random.poisson(lam=max(0, low_tasks), size=n_samples)
    due_soons = np.random.poisson(lam=max(0, due_soon_tasks), size=n_samples)

    # Telemetry distraction ratios (beta distribution, mean ~0.28)
    distraction_ratios = np.random.beta(a=2, b=5, size=n_samples)

    # Pauses and interruptions behavioral averages (Poisson distributions)
    interruptions_features = np.random.poisson(lam=max(0.0, avg_interruptions), size=n_samples)
    pauses_features = np.random.poisson(lam=max(0.0, avg_pauses), size=n_samples)

    completed = []
    burnout_risks = []
    
    for i in range(n_samples):
        dur = session_durations[i]
        hr = study_hours[i]
        dist = distractions[i]
        en = energy_levels[i]
        
        crit = criticals[i]
        h_task = highs[i]
        ds = due_soons[i]
        dist_ratio = distraction_ratios[i]
        int_val = interruptions_features[i]
        pause_val = pauses_features[i]

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
        
        # Task pressure penalty
        prob -= (crit * 0.07 + h_task * 0.04 + ds * 0.05)

        # Distraction ratio penalty (Telemetry)
        prob -= dist_ratio * 0.25

        # Pause & Interruption penalty
        prob -= (int_val * 0.10 + pause_val * 0.05)

        prob = np.clip(prob, 0.05, 0.95)
        comp = np.random.choice([1, 0], p=[prob, 1 - prob])
        completed.append(comp)
        
        # Burnout risk calculation: high study volume + high distractions/pauses + high task load + telemetry distractions
        risk = (dur / 90.0) * 0.15 + (dist / 5.0) * 0.08 + (1.0 - (en / 10.0)) * 0.15
        risk += (crit * 0.08 + h_task * 0.04 + ds * 0.06)
        risk += dist_ratio * 0.15
        risk += (int_val * 0.12 + pause_val * 0.07)

        if comp == 0:
            risk += 0.15
        burnout_risks.append(np.clip(risk, 0.0, 1.0))
        
    df = pd.DataFrame({
        "session_duration": session_durations,
        "study_hour": study_hours,
        "distractions_count": distractions,
        "energy_level": energy_levels,
        "critical_tasks_count": criticals,
        "high_tasks_count": highs,
        "medium_tasks_count": mediums,
        "low_tasks_count": lows,
        "due_soon_tasks_count": due_soons,
        "distraction_ratio_weekly": distraction_ratios,
        "avg_interruptions": interruptions_features,
        "avg_pauses": pauses_features,
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
        cache_key = req.user_id
        cached_model = model_cache.get(cache_key)

        clf = None
        reg = None

        if cached_model and not req.retrain and cached_model.get("history_len") == len(req.history):
            clf = cached_model["clf"]
            reg = cached_model["reg"]
        else:
            # 1. Load baseline synthetic dataset
            # Calculate average interruptions and pauses from history
            avg_int = np.mean([item.interruptions for item in req.history]) if len(req.history) > 0 else 0.5
            avg_p = np.mean([item.pauseCount for item in req.history]) if len(req.history) > 0 else 0.3

            # 1. Load baseline synthetic dataset
            df = generate_synthetic_data(
                req.sleep_time,
                req.wake_up_time,
                req.critical_tasks_count,
                req.high_tasks_count,
                req.medium_tasks_count,
                req.low_tasks_count,
                req.due_soon_tasks_count,
                avg_int,
                avg_p
            )
            
            # 2. Append actual session history if available to customize model
            # Calculate the active weekly distraction ratio to feed real history features
            total_w = req.productive_time_weekly + req.distracting_time_weekly + req.neutral_time_weekly
            dist_ratio_weekly = req.distracting_time_weekly / total_w if total_w > 0 else 0.15

            weights = [1.0] * len(df)

            if len(req.history) > 0:
                hist_rows = []
                for idx, item in enumerate(req.history):
                    try:
                        dt = datetime.fromisoformat(item.startTime.replace("Z", "+00:00"))
                        hr = dt.hour
                        now = datetime.now(dt.tzinfo)
                        delta = now - dt
                        days_ago = max(0.0, delta.days + delta.seconds / 86400.0)
                    except:
                        hr = 18 # fallback
                        days_ago = 0.0
                        
                    decay_weight = float(max(1.0, 2.5 * np.exp(-0.05 * days_ago)))

                    # Determine chronologically "next" session (index idx-1 in desc list)
                    missed_next = False
                    if idx > 0:
                        next_item = req.history[idx - 1]
                        try:
                            t_curr = datetime.fromisoformat(item.startTime.replace("Z", "+00:00"))
                            t_next = datetime.fromisoformat(next_item.startTime.replace("Z", "+00:00"))
                            gap_hours = (t_next - t_curr).total_seconds() / 3600.0
                            if not item.completed and gap_hours > 24.0:
                                missed_next = True
                        except:
                            pass

                    # Behavioral proxy for burnout
                    burnout_val = 0.1
                    if not item.completed:
                        burnout_val += 0.3
                    if item.interruptions > 3:
                        burnout_val += 0.2
                    if item.pauseCount > 2:
                        burnout_val += 0.15
                    if missed_next:
                        burnout_val += 0.2
                    burnout_val = min(1.0, burnout_val)

                    hist_rows.append({
                        "session_duration": int(item.duration / 60),
                        "study_hour": hr,
                        "distractions_count": item.interruptions,
                        "energy_level": req.energy_level if item.completed else max(1, req.energy_level - 3),
                        "critical_tasks_count": req.critical_tasks_count,
                        "high_tasks_count": req.high_tasks_count,
                        "medium_tasks_count": req.medium_tasks_count,
                        "low_tasks_count": req.low_tasks_count,
                        "due_soon_tasks_count": req.due_soon_tasks_count,
                        "distraction_ratio_weekly": dist_ratio_weekly,
                        "avg_interruptions": float(item.interruptions),
                        "avg_pauses": float(item.pauseCount),
                        "completed": 1 if item.completed else 0,
                        "burnout_risk": burnout_val
                    })
                    weights.append(decay_weight)
                df_hist = pd.DataFrame(hist_rows)
                df = pd.concat([df, df_hist], ignore_index=True)

            # 3. Train models
            X = df[[
                "session_duration", 
                "study_hour", 
                "distractions_count", 
                "energy_level",
                "critical_tasks_count",
                "high_tasks_count",
                "medium_tasks_count",
                "low_tasks_count",
                "due_soon_tasks_count",
                "distraction_ratio_weekly",
                "avg_interruptions",
                "avg_pauses"
            ]]
            y_class = df["completed"]
            y_reg = df["burnout_risk"]

            # Hold out 20% validation split for metrics logging
            n_samples_total = len(df)
            indices = np.random.permutation(n_samples_total)
            split_idx = int(n_samples_total * 0.8)
            train_idx, test_idx = indices[:split_idx], indices[split_idx:]

            df_train = df.iloc[train_idx]
            df_test = df.iloc[test_idx]
            weights_train = np.array(weights)[train_idx]

            # Fit on training split
            val_clf = RandomForestClassifier(n_estimators=50, random_state=42)
            val_clf.fit(df_train[X.columns], df_train["completed"], sample_weight=weights_train)
            
            val_reg = RandomForestRegressor(n_estimators=50, random_state=42)
            val_reg.fit(df_train[X.columns], df_train["burnout_risk"], sample_weight=weights_train)

            # Evaluate on validation split
            test_preds_clf = val_clf.predict(df_test[X.columns])
            acc = float(np.mean(test_preds_clf == df_test["completed"]))

            test_preds_reg = val_reg.predict(df_test[X.columns])
            mae = float(np.mean(np.abs(test_preds_reg - df_test["burnout_risk"])))

            print(f"--- ML Engine Retraining: User {req.user_id} | Validation Accuracy: {acc:.3f} | Burnout Risk MAE: {mae:.3f} ---")

            # Final fit on complete dataset
            clf = RandomForestClassifier(n_estimators=50, random_state=42)
            clf.fit(X, y_class, sample_weight=np.array(weights))

            reg = RandomForestRegressor(n_estimators=50, random_state=42)
            reg.fit(X, y_reg, sample_weight=np.array(weights))

            # Save models to cache with history length to auto-trigger retrains
            model_cache[cache_key] = {"clf": clf, "reg": reg, "history_len": len(req.history)}

        # 4. Predict for current profile parameters
        # Evaluate multiple possible study hours to find best slot
        possible_hours = [7, 10, 15, 20] # Morning, Afternoon, Evening, Night indicators
        hour_labels = {7: "Morning", 10: "Afternoon", 15: "Evening", 20: "Night"}
        best_prob = -1.0
        best_hour = 20

        # Calculate distraction ratio and averages for the current predict step
        total_w = req.productive_time_weekly + req.distracting_time_weekly + req.neutral_time_weekly
        dist_ratio_weekly = req.distracting_time_weekly / total_w if total_w > 0 else 0.15
        avg_int = np.mean([item.interruptions for item in req.history]) if len(req.history) > 0 else 0.5
        avg_p = np.mean([item.pauseCount for item in req.history]) if len(req.history) > 0 else 0.3

        for hr in possible_hours:
            feat = np.array([[
                req.session_duration, 
                hr, 
                req.distractions_count, 
                req.energy_level,
                req.critical_tasks_count,
                req.high_tasks_count,
                req.medium_tasks_count,
                req.low_tasks_count,
                req.due_soon_tasks_count,
                dist_ratio_weekly,
                avg_int,
                avg_p
            ]])
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

        current_feat = np.array([[
            req.session_duration, 
            current_study_hour, 
            req.distractions_count, 
            req.energy_level,
            req.critical_tasks_count,
            req.high_tasks_count,
            req.medium_tasks_count,
            req.low_tasks_count,
            req.due_soon_tasks_count,
            dist_ratio_weekly,
            avg_int,
            avg_p
        ]])
        completion_prob = float(clf.predict_proba(current_feat)[0][1])
        burnout_risk_score = float(reg.predict(current_feat)[0])

        completion_prob = np.clip(completion_prob, 0.05, 0.95)
        burnout_risk_score = np.clip(burnout_risk_score, 0.0, 1.0)

        # Optimize preferred session duration
        durations = [25, 45, 60, 90]
        best_dur_prob = -1.0
        recommended_dur = 25
        for d in durations:
            feat = np.array([[
                d, 
                current_study_hour, 
                req.distractions_count, 
                req.energy_level,
                req.critical_tasks_count,
                req.high_tasks_count,
                req.medium_tasks_count,
                req.low_tasks_count,
                req.due_soon_tasks_count,
                dist_ratio_weekly,
                avg_int,
                avg_p
            ]])
            prob = clf.predict_proba(feat)[0][1]
            if prob > best_dur_prob:
                best_dur_prob = prob
                recommended_dur = d

        # Confidence score based on:
        # 1. Classifier probability margin from 0.5 (uncertainty boundary)
        # 2. Regressor tree prediction variance (standard deviation of estimators)
        clf_confidence = 2.0 * abs(completion_prob - 0.5)
        
        # Calculate standard deviation of tree predictions for burnout_risk
        tree_preds = [float(tree.predict(current_feat)[0]) for tree in reg.estimators_]
        reg_std = float(np.std(tree_preds))
        reg_confidence = float(max(0.0, 1.0 - reg_std * 2.0))
        
        # Blend the confidence scores and clip between 0.5 and 0.95
        confidence = float(np.clip(0.4 + 0.6 * (0.5 * clf_confidence + 0.5 * reg_confidence), 0.5, 0.95))

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
