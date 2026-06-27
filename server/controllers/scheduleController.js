const Schedule = require("../models/Schedule");
const UserProfile = require("../models/UserProfile");
const ScheduledSessionLog = require("../models/ScheduledSessionLog");
const Task = require("../models/Task");
const User = require("../models/User");
const Pod = require("../models/Pod");
const PodActivity = require("../models/PodActivity");
const Notification = require("../models/Notification");

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

        // 0. Protected Leisure Blocks
        const protectedBlocks = (profile.protectedBlocks || []).filter(block => 
            !block.repeat || block.repeat.length === 0 || block.repeat.includes(day)
        );
        protectedBlocks.forEach(block => {
            events.push({
                title: block.name,
                type: "leisure",
                startTime: block.start,
                endTime: block.end
            });
        });

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

        // 0. Protected Leisure Blocks
        const protectedBlocks = (profile.protectedBlocks || []).filter(block => 
            !block.repeat || block.repeat.length === 0 || block.repeat.includes(day)
        );
        protectedBlocks.forEach(block => {
            events.push({
                title: block.name,
                type: "leisure",
                startTime: block.start,
                endTime: block.end
            });
        });

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

// GET /api/schedule/missed-sessions
const getMissedSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, dayName, currentTime } = req.query;

        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const now = new Date();
        const fallbackDayName = weekdays[now.getDay()];
        const fallbackDate = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
        const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const targetDate = date || fallbackDate;
        const targetDayName = dayName || fallbackDayName;
        const targetTime = currentTime || fallbackTime;

        const schedule = await Schedule.findOne({ userId });
        if (!schedule) {
            return res.status(200).json({ success: true, missedSessions: [] });
        }

        const daySchedule = schedule.days?.find(d => d.dayName === targetDayName);
        if (!daySchedule || !daySchedule.events) {
            return res.status(200).json({ success: true, missedSessions: [] });
        }

        const studyEvents = daySchedule.events.filter(e => e.type === "study");
        if (studyEvents.length === 0) {
            return res.status(200).json({ success: true, missedSessions: [] });
        }

        // Fetch completed focus sessions today
        const startOfToday = new Date(targetDate + "T00:00:00");
        const endOfToday = new Date(targetDate + "T23:59:59");
        const FocusSession = require("../models/FocusSession");
        const focusSessions = await FocusSession.find({
            userId,
            sessionType: "Focus",
            startTime: { $gte: startOfToday, $lte: endOfToday }
        });

        const targetTimeMins = timeToMins(targetTime);

        for (const event of studyEvents) {
            const eventEndMins = timeToMins(event.endTime);
            // Only consider events that have completely ended
            if (targetTimeMins > eventEndMins) {
                // Check if a log already exists for this event
                let log = await ScheduledSessionLog.findOne({
                    userId,
                    date: targetDate,
                    eventTitle: event.title,
                    startTime: event.startTime
                });

                if (!log) {
                    // Check if any focus session matches this event slot (+/- 30 mins buffer on start time)
                    const eventStartMins = timeToMins(event.startTime);
                    const matchingSession = focusSessions.find(fs => {
                        const fsStart = new Date(fs.startTime);
                        const fsStartMins = fsStart.getHours() * 60 + fsStart.getMinutes();
                        return Math.abs(fsStartMins - eventStartMins) <= 30;
                    });

                    if (matchingSession) {
                        // Log as Completed/Partially Completed
                        log = await ScheduledSessionLog.create({
                            userId,
                            date: targetDate,
                            eventTitle: event.title,
                            startTime: event.startTime,
                            endTime: event.endTime,
                            status: matchingSession.completed ? "Completed" : "Partially Completed",
                            taskId: matchingSession.taskId || null
                        });
                    } else {
                        // Log as Missed Session
                        log = await ScheduledSessionLog.create({
                            userId,
                            date: targetDate,
                            eventTitle: event.title,
                            startTime: event.startTime,
                            endTime: event.endTime,
                            status: "Missed Session"
                        });
                    }
                }
            }
        }

        // Return all missed session logs for today that have not been recovered yet (importance is null)
        const missedSessions = await ScheduledSessionLog.find({
            userId,
            date: targetDate,
            status: "Missed Session",
            importance: null
        });

        res.status(200).json({
            success: true,
            missedSessions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching missed sessions",
            error: error.message
        });
    }
};

// Rearrange schedule helper algorithm
async function rearrangeScheduleHelper(userId, dateStr, eventTitle, origStart, origEnd, choice) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Parse date to weekday name
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    let targetDayName = weekdays[dateObj.getDay()];

    const profile = await UserProfile.findOne({ userId });
    const schedule = await Schedule.findOne({ userId });
    if (!profile || !schedule) return false;

    // Determine current time or start time for scheduling
    const now = new Date();
    let currentTimeMins = now.getHours() * 60 + now.getMinutes();

    let targetDaySchedule = schedule.days.find(d => d.dayName === targetDayName);
    if (!targetDaySchedule) return false;

    // If Important: push to tomorrow's schedule
    if (choice === "Important") {
        const tomorrowObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowDayName = weekdays[tomorrowObj.getDay()];
        targetDayName = tomorrowDayName;
        targetDaySchedule = schedule.days.find(d => d.dayName === targetDayName);
        currentTimeMins = timeToMins(profile.schedule?.wakeUpTime || "06:00") + 30; // Start tomorrow morning
        if (!targetDaySchedule) return false;
    }

    const sleepStart = timeToMins(profile.schedule?.sleepTime || "22:00");

    // Separate events of the target day
    const events = targetDaySchedule.events || [];
    const pastEvents = [];
    const fixedEvents = [];
    const flexibleStudySessions = [];

    // Identify tasks to match priorities
    const tasks = await Task.find({ userId });

    events.forEach(e => {
        const eStart = timeToMins(e.startTime);
        const eEnd = timeToMins(e.endTime);

        // Past events (only relevant for today)
        if (choice === "Critical" && eEnd < currentTimeMins) {
            pastEvents.push(e);
            return;
        }

        // Fixed/Protected Blocks: sleep, class, coaching, commute, or matching user's protectedBlocks
        const isSleep = e.type === "sleep";
        const isClass = e.type === "class";
        const isCoaching = e.type === "coaching";
        const isCommute = e.type === "commute";
        const isProtectedLeisure = (profile.protectedBlocks || []).some(pb => 
            pb.name === e.title && pb.start === e.startTime && pb.end === e.endTime
        );

        if (isSleep || isClass || isCoaching || isCommute || isProtectedLeisure) {
            fixedEvents.push(e);
        } else if (e.type === "study") {
            // Match with task priority
            let taskPriority = "Medium";
            let taskSkipCost = "Medium";
            let taskFlexibility = "Flexible";

            const matchedTask = tasks.find(t => t.title === e.associatedGoal || e.title.includes(t.title));
            if (matchedTask) {
                taskPriority = matchedTask.priority;
                taskSkipCost = matchedTask.skipCost;
                taskFlexibility = matchedTask.flexibility;
            }

            flexibleStudySessions.push({
                title: e.title,
                type: "study",
                associatedGoal: e.associatedGoal,
                priority: taskPriority,
                skipCost: taskSkipCost,
                flexibility: taskFlexibility,
                duration: eEnd - eStart
            });
        }
    });

    // Add the recovered missed session as Critical/High priority study session to place
    const recoveredGoal = eventTitle.replace("Study: ", "");
    const matchedTask = tasks.find(t => t.title === recoveredGoal || eventTitle.includes(t.title));
    const recoveredDuration = profile.focus?.preferredSessionDuration || 45;

    flexibleStudySessions.push({
        title: eventTitle,
        type: "study",
        associatedGoal: recoveredGoal,
        priority: choice === "Critical" ? "Critical" : "High",
        skipCost: matchedTask?.skipCost || "Medium",
        flexibility: "Flexible",
        duration: recoveredDuration
    });

    // Sort flexible study sessions by Priority (Critical > High > Medium > Low) and then skipCost (High > Medium > Low)
    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const skipCostWeight = { High: 3, Medium: 2, Low: 1 };

    flexibleStudySessions.sort((a, b) => {
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return skipCostWeight[b.skipCost] - skipCostWeight[a.skipCost];
    });

    // Combine past events and fixed events to get all occupied intervals
    const occupiedBlocks = [...pastEvents, ...fixedEvents].map(e => ({
        start: timeToMins(e.startTime),
        end: timeToMins(e.endTime)
    }));

    // Find flexible windows from current time to sleepStart
    let remainingStart = currentTimeMins;
    const flexibleWindows = [];

    occupiedBlocks.sort((a, b) => a.start - b.start);

    occupiedBlocks.forEach(block => {
        if (block.start > remainingStart) {
            flexibleWindows.push({ start: remainingStart, end: block.start });
        }
        if (block.end > remainingStart) {
            remainingStart = block.end;
        }
    });

    if (remainingStart < sleepStart) {
        flexibleWindows.push({ start: remainingStart, end: sleepStart });
    }

    // Pack study sessions inside remaining flexible windows
    const scheduledEvents = [];
    let windowIndex = 0;

    for (const session of flexibleStudySessions) {
        let placed = false;
        
        while (windowIndex < flexibleWindows.length && !placed) {
            const win = flexibleWindows[windowIndex];
            const winDuration = win.end - win.start;

            if (winDuration >= session.duration) {
                const sStart = win.start;
                const sEnd = win.start + session.duration;
                
                scheduledEvents.push({
                    title: session.title,
                    type: "study",
                    startTime: minsToTime(sStart),
                    endTime: minsToTime(sEnd),
                    associatedGoal: session.associatedGoal
                });

                // Enforce Breaks: add break if space allows
                const breakStart = sEnd;
                const breakDuration = 15;
                const breakEnd = breakStart + breakDuration;

                if (breakEnd <= win.end) {
                    scheduledEvents.push({
                        title: `Break (${profile.focus?.breakPreference || "Rest"})`,
                        type: "break",
                        startTime: minsToTime(breakStart),
                        endTime: minsToTime(breakEnd)
                    });
                    win.start = breakEnd;
                } else {
                    win.start = sEnd;
                }

                placed = true;
            } else {
                windowIndex++;
            }
        }
    }

    const newEventsList = [...pastEvents, ...fixedEvents, ...scheduledEvents];
    newEventsList.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

    targetDaySchedule.events = newEventsList;
    await schedule.save();
    return true;
}

// POST /api/schedule/recover
const recoverSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { logId, choice } = req.body;

        if (!logId || !choice) {
            return res.status(400).json({ success: false, message: "Missing logId or choice" });
        }

        const log = await ScheduledSessionLog.findOne({ _id: logId, userId });
        if (!log) {
            return res.status(404).json({ success: false, message: "Scheduled session log not found" });
        }

        log.importance = choice;

        if (choice === "Optional") {
            log.status = "Skipped";
            await log.save();
        } else if (choice === "Cancel") {
            log.status = "Skipped";
            await log.save();

            // Delete event from schedule
            const schedule = await Schedule.findOne({ userId });
            if (schedule) {
                const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const [year, month, day] = log.date.split("-").map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dayName = weekdays[dateObj.getDay()];

                const daySched = schedule.days.find(d => d.dayName === dayName);
                if (daySched) {
                    daySched.events = daySched.events.filter(e => 
                        !(e.title === log.eventTitle && e.startTime === log.startTime && e.endTime === log.endTime)
                    );
                    await schedule.save();
                }
            }
        } else if (choice === "Critical") {
            log.status = "Postponed";
            await log.save();

            await rearrangeScheduleHelper(userId, log.date, log.eventTitle, log.startTime, log.endTime, "Critical");
        } else if (choice === "Important") {
            log.status = "Postponed";
            await log.save();

            await rearrangeScheduleHelper(userId, log.date, log.eventTitle, log.startTime, log.endTime, "Important");
        }

        // --- SOCIAL PODS RECOVERY HOOK ---
        if (choice === "Critical" || choice === "Important") {
            try {
                const user = await User.findById(userId);
                if (user) {
                    const userPods = await Pod.find({ "members.userId": userId });
                    for (const pod of userPods) {
                        const activity = new PodActivity({
                            podId: pod._id,
                            userId,
                            type: "recovery",
                            message: `${user.name} rescheduled and recovered their missed session "${log.eventTitle}"!`
                        });
                        await activity.save();

                        const otherMembers = pod.members.filter(m => m.userId.toString() !== userId);
                        const notifications = otherMembers.map(m => ({
                            userId: m.userId,
                            title: "Pod Member Recovered Session",
                            message: `${user.name} rescheduled their missed session "${log.eventTitle}"!`,
                            type: "pod",
                            read: false
                        }));
                        if (notifications.length > 0) {
                            await Notification.insertMany(notifications);
                        }
                    }
                }
            } catch (podErr) {
                console.error("Error logging pod recovery event:", podErr);
            }
        }

        const schedule = await Schedule.findOne({ userId });

        res.status(200).json({
            success: true,
            message: `Session recovered as ${choice}`,
            schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error recovering session",
            error: error.message
        });
    }
};

// GET /api/schedule/adaptive-suggestions
const getAdaptiveSuggestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const logs = await ScheduledSessionLog.find({
            userId,
            createdAt: { $gte: lastWeek }
        });

        const suggestions = [];

        if (logs.length === 0) {
            suggestions.push({
                type: "info",
                title: "Keep it Up! 🚀",
                message: "No missed slots recorded this week. Maintain your consistency and keep protecting your leisure blocks to prevent burnout."
            });
            return res.status(200).json({ success: true, suggestions });
        }

        // Group by event title
        const group = {};
        logs.forEach(log => {
            if (!group[log.eventTitle]) {
                group[log.eventTitle] = { total: 0, missed: 0, startTime: log.startTime };
            }
            group[log.eventTitle].total += 1;
            if (log.status === "Missed Session" || log.status === "Skipped") {
                group[log.eventTitle].missed += 1;
            }
        });

        let foundIssue = false;
        Object.entries(group).forEach(([title, data]) => {
            const skipRate = data.missed / data.total;
            if (skipRate >= 0.5 && data.total >= 2) {
                foundIssue = true;
                suggestions.push({
                    type: "adjustment",
                    title: `Optimize: ${title}`,
                    message: `You skipped/missed this slot ${Math.round(skipRate * 100)}% of the time this week. We recommend shortening this session to 25 mins or shifting its timing to your peak focus periods.`
                });
            }
        });

        if (!foundIssue) {
            suggestions.push({
                type: "info",
                title: "Great Consistency! 🌟",
                message: "Your schedule compliance is high. Protect your leisure blocks and keep taking regular break buffers to stay balanced."
            });
        }

        res.status(200).json({
            success: true,
            suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching suggestions",
            error: error.message
        });
    }
};

module.exports = {
    getSchedule,
    generateBaselineSchedule,
    updateSchedule,
    generateScheduleHelper,
    getMissedSessions,
    recoverSession,
    getAdaptiveSuggestions
};
