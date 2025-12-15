import Challenge from "../models/Challenge.js";
import User from "../models/User.js";

// Get all challenges
export const getChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find().populate("participants", "username avatar");
    res.json({ success: true, data: challenges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update user progress for a challenge
export const updateChallengeProgress = async (req, res) => {
  try {
    const { challengeId, steps, distance } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ msg: "Challenge not found" });

    let progressEntry = challenge.progress.find(p => p.user.toString() === req.user._id.toString());
    if (!progressEntry) {
      progressEntry = { user: req.user._id, currentProgress: 0, completed: false };
      challenge.progress.push(progressEntry);
    }

    if (challenge.type === "steps") progressEntry.currentProgress += steps || 0;
    if (challenge.type === "distance") progressEntry.currentProgress += distance || 0;

    progressEntry.completed = progressEntry.currentProgress >= challenge.goal;
    await challenge.save();

    res.json({ success: true, data: progressEntry });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
