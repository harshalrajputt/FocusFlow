const Schedule = require("../models/Schedule");
const UserProfile = require("../models/UserProfile");

// Helper: Convert time string "HH:MM" to minutes from midnight
function timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

// Helper: Convert minutes from midnight to "HH:MM"
function minsToTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Check if a time range overlaps with any event in the day list
function hasOverlap(start, end, events) {
    return events.some(e => {
        const eStart = timeToMins(e.startTime);
        const eEnd = timeToMins(e.endTime);
        
        // Handle cross-midnight events
        if (eEnd < eStart) {
            // Event spans midnight (e.g., 22:00 to 06:00)
            return (start >= eStart || start < eEnd) || 
                   (end > eStart || end <= eEnd) || 
                   (start < eStart && end > eEnd);
        }
        
        return (start < eEnd && end > eStart);
    });
}

// Core generator logic
const generateScheduleHelper = (profile) => {
    const scheduleDays = [];
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weekendDays = ["Saturday", "Sunday"];

    const sleepStart = timeToMins(profile.schedule?.sleepTime || "22:00");
    const sleepEnd = timeToMins(profile.schedule?.wakeUpTime || "06:00");

    const classStart = timeToMins(profile.schedule?.classTimings?.start || "08:00");
    const classEnd = timeToMins(profile.schedule?.classTimings?.end || "14:00");

    const coachingStart = timeToMins(profile.schedule?.coachingTimings?.start || "16:00");
    const coachingEnd = timeToMins(profile.schedule?.coachingTimings?.end || "18:00");

    const commuteMins = profile.schedule?.commuteDuration || 0;

    // Subjects to study based on goals and skills
    const goalsList = profile.goals?.academicGoals || [];
    const skillsList = profile.goals?.skillsToLearn || [];
    const subjects = [...goalsList, ...skillsList];
    if (subjects.length === 0) {
        subjects.push("Self Study", "Skill Development");
    }

    const preferredDuration = profile.focus?.preferredSessionDuration || 45; // in mins

    // Generate weekdays
    weekdays.forEach(day => {
        const events = [];

        // 1. Sleep Block (spans from sleepStart to sleepEnd)
        if (sleepStart > sleepEnd) {
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: minsToTime(sleepStart),
                endTime: "23:59"
            });
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: "00:00",
                endTime: minsToTime(sleepEnd)
            });
        } else {
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: minsToTime(sleepStart),
                endTime: minsToTime(sleepEnd)
            });
        }

        // 2. Class Block
        events.push({
            title: `${profile.basic?.academicLevel === "Undergraduate" || profile.basic?.academicLevel === "Postgraduate" ? "College Lecture" : "School Classes"}`,
            type: "class",
            startTime: minsToTime(classStart),
            endTime: minsToTime(classEnd)
        });

        // 3. Commute Blocks
        if (commuteMins > 0) {
            const morningCommuteStart = classStart - commuteMins;
            events.push({
                title: "Commute to Campus",
                type: "commute",
                startTime: minsToTime(morningCommuteStart),
                endTime: minsToTime(classStart)
            });

            const eveningCommuteEnd = classEnd + commuteMins;
            events.push({
                title: "Commute Back Home",
                type: "commute",
                startTime: minsToTime(classEnd),
                endTime: minsToTime(eveningCommuteEnd)
            });
        }

        // 4. Coaching Block
        if (profile.schedule?.coachingTimings?.start && profile.schedule?.coachingTimings?.end) {
            events.push({
                title: "Tuition / Coaching Classes",
                type: "coaching",
                startTime: minsToTime(coachingStart),
                endTime: minsToTime(coachingEnd)
            });
        }

        // 5. Study Block Allocations based on Productivity Peaks
        // Sift through the day to find study slots
        const peakFocus = profile.productivity?.mostProductiveHours || "Morning";
        let studyHourStart = 18 * 60; // default 6:00 PM

        if (peakFocus === "Morning") {
            // If they wake up early, try before class, else right after class
            const potentialStart = sleepEnd + 30; // 30m after waking up
            if (potentialStart + preferredDuration < classStart - commuteMins) {
                studyHourStart = potentialStart;
            } else {
                studyHourStart = classEnd + commuteMins + 60; // 1 hour after coming home
            }
        } else if (peakFocus === "Afternoon") {
            studyHourStart = classEnd + commuteMins + 60;
        } else if (peakFocus === "Evening") {
            studyHourStart = (coachingEnd || (classEnd + commuteMins)) + 60;
        } else if (peakFocus === "Night") {
            studyHourStart = 20 * 60; // 8:00 PM
        }

        // Allocate Study slot 1
        let study1Start = studyHourStart;
        let study1End = study1Start + preferredDuration;
        
        // Ensure no overlap, find next available if overlapping
        let safetyCounter = 0;
        while (hasOverlap(study1Start, study1End, events) && safetyCounter < 24) {
            study1Start = (study1Start + 30) % 1440;
            study1End = study1Start + preferredDuration;
            safetyCounter++;
        }

        const subject1 = subjects[0 % subjects.length];
        events.push({
            title: `Study: ${subject1}`,
            type: "study",
            startTime: minsToTime(study1Start),
            endTime: minsToTime(study1End),
            associatedGoal: subject1
        });

        // Break slot
        const break1Start = study1End;
        const break1End = break1Start + 15; // 15 mins break
        if (!hasOverlap(break1Start, break1End, events)) {
            events.push({
                title: `Break (${profile.focus?.breakPreference || "Rest"})`,
                type: "break",
                startTime: minsToTime(break1Start),
                endTime: minsToTime(break1End)
            });
        }

        // Study slot 2
        let study2Start = break1End + 15; // 15 mins gap
        let study2End = study2Start + preferredDuration;
        safetyCounter = 0;
        while (hasOverlap(study2Start, study2End, events) && safetyCounter < 24) {
            study2Start = (study2Start + 30) % 1440;
            study2End = study2Start + preferredDuration;
            safetyCounter++;
        }

        const subject2 = subjects[1 % subjects.length] || subject1;
        events.push({
            title: `Study: ${subject2}`,
            type: "study",
            startTime: minsToTime(study2Start),
            endTime: minsToTime(study2End),
            associatedGoal: subject2
        });

        // 6. Revision block before Sleep
        const revisionEnd = sleepStart - 10; // 10 mins before sleep
        const revisionStart = revisionEnd - 30; // 30 min revision
        if (!hasOverlap(revisionStart, revisionEnd, events)) {
            events.push({
                title: "Revision Session",
                type: "study",
                startTime: minsToTime(revisionStart),
                endTime: minsToTime(revisionEnd),
                associatedGoal: "Daily Review"
            });
        }

        // Sort events chronologically by start time
        events.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

        scheduleDays.push({
            dayName: day,
            events
        });
    });

    // Generate weekends (Saturday & Sunday) - leisure and light studies
    weekendDays.forEach(day => {
        const events = [];

        // Sleep
        if (sleepStart > sleepEnd) {
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: minsToTime(sleepStart),
                endTime: "23:59"
            });
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: "00:00",
                endTime: minsToTime(sleepEnd)
            });
        } else {
            events.push({
                title: "Sleep",
                type: "sleep",
                startTime: minsToTime(sleepStart),
                endTime: minsToTime(sleepEnd)
            });
        }

        // Light morning study block
        const studyStart = sleepEnd + 120; // 2 hours after waking up
        const studyEnd = studyStart + 60; // 1 hour study
        const weekendSubject = subjects[0 % subjects.length];
        events.push({
            title: `Study: ${weekendSubject}`,
            type: "study",
            startTime: minsToTime(studyStart),
            endTime: minsToTime(studyEnd),
            associatedGoal: weekendSubject
        });

        // Leisure time (rest of afternoon)
        events.push({
            title: "Leisure & Personal Time",
            type: "leisure",
            startTime: minsToTime(studyEnd),
            endTime: minsToTime(sleepStart - 60)
        });

        // Evening Revision
        events.push({
            title: "Weekend Goal Review",
            type: "study",
            startTime: minsToTime(sleepStart - 60),
            endTime: minsToTime(sleepStart - 10),
            associatedGoal: "Weekly Review"
        });

        // Sort events chronologically
        events.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

        scheduleDays.push({
            dayName: day,
            events
        });
    });

    return scheduleDays;
};

// GET schedule (returns existing or triggers auto-generate)
const getSchedule = async (req, res) => {
    try {
        let schedule = await Schedule.findOne({ userId: req.user.id });
        
        if (!schedule) {
            // Fetch profile
            const profile = await UserProfile.findOne({ userId: req.user.id });
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: "User profile not found. Complete onboarding first."
                });
            }

            const days = generateScheduleHelper(profile);
            schedule = await Schedule.create({
                userId: req.user.id,
                days
            });
        }

        res.status(200).json({
            success: true,
            schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching schedule",
            error: error.message
        });
    }
};

// POST regenerate schedule
const generateBaselineSchedule = async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "User profile not found. Complete onboarding first."
            });
        }

        const days = generateScheduleHelper(profile);
        
        const schedule = await Schedule.findOneAndUpdate(
            { userId: req.user.id },
            { days },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: "Baseline schedule generated successfully",
            schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while generating baseline schedule",
            error: error.message
        });
    }
};

// PUT update schedule events manually
const updateSchedule = async (req, res) => {
    try {
        const { days } = req.body;
        if (!days || !Array.isArray(days)) {
            return res.status(400).json({
                success: false,
                message: "Valid days array is required"
            });
        }

        const schedule = await Schedule.findOneAndUpdate(
            { userId: req.user.id },
            { days },
            { new: true }
        );

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Schedule updated successfully",
            schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while updating schedule",
            error: error.message
        });
    }
};

module.exports = {
    getSchedule,
    generateBaselineSchedule,
    updateSchedule,
    generateScheduleHelper
};
