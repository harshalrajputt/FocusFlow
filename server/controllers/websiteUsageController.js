const WebsiteUsage = require("../models/WebsiteUsage");
const WeeklyWebsiteUsage = require("../models/WeeklyWebsiteUsage");
const MonthlyWebsiteUsage = require("../models/MonthlyWebsiteUsage");

const PRODUCTIVE_DOMAINS = [
    "leetcode.com",
    "geeksforgeeks.org",
    "github.com",
    "stackoverflow.com",
    "chatgpt.com",
    "localhost",
    "coursera.org",
    "udemy.com",
    "khanacademy.org"
];

const DISTRACTING_DOMAINS = [
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "reddit.com",
    "twitter.com",
    "x.com",
    "netflix.com",
    "twitch.tv",
    "roblox.com"
];

const NEUTRAL_DOMAINS = [
    "gmail.com",
    "mail.google.com",
    "docs.google.com",
    "drive.google.com",
    "notion.so",
    "sheets.google.com"
];

const classifyDomain = (domain) => {
    const cleanDomain = domain.toLowerCase().trim().replace("www.", "");
    
    // Check local address
    if (cleanDomain.startsWith("localhost") || cleanDomain.startsWith("127.0.0.1")) {
        return "Productive";
    }
    
    if (PRODUCTIVE_DOMAINS.some(d => cleanDomain.includes(d))) return "Productive";
    if (DISTRACTING_DOMAINS.some(d => cleanDomain.includes(d))) return "Distracting";
    if (NEUTRAL_DOMAINS.some(d => cleanDomain.includes(d))) return "Neutral";
    
    return "Neutral";
};

// Get Monday of the date's week (YYYY-MM-DD)
function getWeekStartDate(dateStr) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when Sunday to get Monday
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split("T")[0];
    } catch (e) {
        return dateStr;
    }
}

// Get 1st of the date's month (YYYY-MM-01)
function getMonthStartDate(dateStr) {
    try {
        const [year, month] = dateStr.split("-");
        if (!year || !month) return dateStr;
        return `${year}-${month}-01`;
    } catch (e) {
        return dateStr;
    }
}

// Batch log website usage from extension
const logWebsiteUsage = async (req, res) => {
    const userId = req.user.id;
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({ success: false, message: "Invalid logs payload." });
    }
    
    try {
        for (const log of logs) {
            const { domain, timeSpent, date } = log;
            if (!domain || !date || typeof timeSpent !== "number" || timeSpent <= 0) continue;
            
            const category = classifyDomain(domain);
            
            // 1. Increment Daily
            await WebsiteUsage.findOneAndUpdate(
                { userId, date, domain },
                { 
                    $inc: { timeSpent },
                    $set: { category }
                },
                { upsert: true }
            );

            // 2. Increment Weekly
            const weekStartDate = getWeekStartDate(date);
            await WeeklyWebsiteUsage.findOneAndUpdate(
                { userId, weekStartDate, domain },
                { 
                    $inc: { timeSpent },
                    $set: { category }
                },
                { upsert: true }
            );

            // 3. Increment Monthly
            const monthStartDate = getMonthStartDate(date);
            await MonthlyWebsiteUsage.findOneAndUpdate(
                { userId, monthStartDate, domain },
                { 
                    $inc: { timeSpent },
                    $set: { category }
                },
                { upsert: true }
            );
        }
        
        return res.status(200).json({ success: true, message: "Website usage logs saved successfully." });
    } catch (error) {
        console.error("Error logging website usage:", error);
        return res.status(500).json({ success: false, message: "Server error saving logs." });
    }
};

// Fetch aggregated daily stats & Focus Score
const getDailyStats = async (req, res) => {
    const userId = req.user.id;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    
    try {
        const logs = await WebsiteUsage.find({ userId, date });
        
        let productiveTime = 0;
        let distractingTime = 0;
        let neutralTime = 0;
        
        const domains = logs.map(log => {
            const minutes = Math.round(log.timeSpent / 60);
            if (log.category === "Productive") productiveTime += log.timeSpent;
            else if (log.category === "Distracting") distractingTime += log.timeSpent;
            else neutralTime += log.timeSpent;
            
            return {
                domain: log.domain,
                timeSpent: log.timeSpent,
                category: log.category,
                minutes
            };
        });
        
        // Sort domains by time spent desc
        domains.sort((a, b) => b.timeSpent - a.timeSpent);
        
        const totalActiveTime = productiveTime + distractingTime + neutralTime;
        let focusScore = 0;
        if (totalActiveTime > 0) {
            focusScore = Math.round((productiveTime / totalActiveTime) * 100);
        }
        
        return res.status(200).json({
            success: true,
            date,
            focusScore,
            summary: {
                productiveTime,
                distractingTime,
                neutralTime,
                totalActiveTime
            },
            domains
        });
    } catch (error) {
        console.error("Error fetching daily stats:", error);
        return res.status(500).json({ success: false, message: "Server error fetching stats." });
    }
};

module.exports = {
    logWebsiteUsage,
    getDailyStats
};
