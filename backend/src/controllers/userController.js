import User from "../models/User.js";

export const getProfile = async (req, res) => {
  try {
    const baseUser = req.user && req.user._id ? req.user : await User.findById(req.user?.id || req.user?._id).select("-password");

    if (!baseUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    await baseUser.populate("badges");

    baseUser.ensureDailyReset();

    if (baseUser.isModified()) {
      await baseUser.save();
    }

    res.json(baseUser);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = ["username", "displayName", "avatar", "avatarUrl", "location", "bio", "city"];
    const updates = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key] === null ? "" : req.body[key];
      }
      if (updates.avatar === "" || updates.avatar === null) {
        updates.avatar = null;
      }
    }

    if (typeof updates.city === "string") {
      const normalizedCity = updates.city.trim();
      updates.city = normalizedCity.length > 0 ? normalizedCity : undefined;
      if (!updates.city) {
        delete updates.city;
      }
    }

    if (updates.location && updates.location.coordinates) {
      updates.location.type = "Point";
    } else {
      delete updates.location;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");
    console.log("User profile response:", user.avatarUrl);
    res.json(user);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Add this in controllers/userController.js
export const addBadge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { badge } = req.body;

    // Example: push badge into user's badges array
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { badges: badge } },
      { new: true }
    );

    res.json({ success: true, data: user.badges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


export const syncStats = async (req, res) => {
  try {
    const { steps, distance } = req.body;

    if (!steps && !distance) {
      return res.status(400).json({ msg: "No stats provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.ensureDailyReset();

    if (steps) user.updateSteps(Number(steps));
    if (distance) user.updateDistance(Number(distance));

    await user.save();

    res.json({
      msg: "Stats synced successfully",
      user: {
        id: user._id,
        steps: user.steps,
        distance: user.distance,
        lifetimeSteps: user.lifetimeSteps,
        lifetimeDistance: user.lifetimeDistance,
        territories: user.territories,
      },
    });
  } catch (err) {
    console.error("Stats sync error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

