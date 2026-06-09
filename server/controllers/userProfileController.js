const UserProfile = require("../models/UserProfile");

const getProfile = async (req, res) => {
    try {
        let profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) {
            profile = await UserProfile.create({ userId: req.user.id });
        }
        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error retrieving profile",
            error: error.message
        });
    }
};

const upsertProfile = async (req, res) => {
    try {
        let profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) {
            profile = new UserProfile({ userId: req.user.id });
        }

        const { basic, schedule, productivity, focus, goals, onboardingStep } = req.body;

        if (basic) {
            profile.basic = { ...profile.basic, ...basic };
        }
        if (schedule) {
            profile.schedule = { ...profile.schedule, ...schedule };
        }
        if (productivity) {
            profile.productivity = { ...profile.productivity, ...productivity };
        }
        if (focus) {
            profile.focus = { ...profile.focus, ...focus };
        }
        if (goals) {
            profile.goals = { ...profile.goals, ...goals };
        }
        if (onboardingStep !== undefined) {
            profile.onboardingStep = onboardingStep;
        }

        await profile.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: profile
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error updating profile",
            error: error.message
        });
    }
};

const completeOnboarding = async (req, res) => {
    try {
        let profile = await UserProfile.findOne({ userId: req.user.id });
        if (!profile) {
            profile = new UserProfile({ userId: req.user.id });
        }
        profile.onboardingCompleted = true;
        await profile.save();

        res.status(200).json({
            success: true,
            message: "Onboarding completed successfully",
            data: profile
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error completing onboarding",
            error: error.message
        });
    }
};

module.exports = {
    getProfile,
    upsertProfile,
    completeOnboarding
};
