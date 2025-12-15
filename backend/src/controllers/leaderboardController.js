import User from "../models/User.js";
import Territory from "../models/Territory.js";

const GLOBAL_LIMIT = 50;
const CITY_LIMIT = 25;

const serializeGlobalLeaderboard = (users) =>
  users.map((user, index) => ({
    userId: user._id?.toString?.() ?? user._id,
    username: user.username,
    avatar: user.avatar ?? null,
    city: user.city ?? null,
    steps: user.steps ?? 0,
    distance: user.distance ?? 0,
    lifetimeSteps: user.lifetimeSteps ?? 0,
    lifetimeDistance: user.lifetimeDistance ?? 0,
    rank: index + 1,
    totalArea: 0,
    territoryCount: 0,
  }));

const fetchGlobalLeaderboard = async (limit = GLOBAL_LIMIT) => {
  const users = await User.find()
    .sort({ distance: -1, steps: -1, lifetimeDistance: -1 })
    .limit(limit)
    .select("username avatar distance steps city lifetimeSteps lifetimeDistance")
    .lean();

  return serializeGlobalLeaderboard(users ?? []);
};

const escapeForRegex = (input = "") => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await fetchGlobalLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCityLeaderboard = async (req, res) => {
  try {
    const rawCity = req.query.city?.trim();

    if (!rawCity) {
      return res.status(400).json({ success: false, message: "city query parameter is required" });
    }

    const cityRegex = new RegExp(`^${escapeForRegex(rawCity)}$`, "i");

    const usersInCity = await User.find({ city: cityRegex })
      .select("username avatar steps city territories distance lifetimeSteps lifetimeDistance")
      .limit(CITY_LIMIT)
      .lean();

    const normalizedUsers = [...(usersInCity ?? [])];

    if (req.user && req.user.city && cityRegex.test(req.user.city)) {
      const alreadyIncluded = normalizedUsers.some((candidate) => candidate._id?.toString?.() === req.user._id.toString());
      if (!alreadyIncluded) {
        normalizedUsers.push({
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar ?? null,
          city: req.user.city ?? null,
          steps: req.user.steps ?? 0,
          territories: req.user.territories ?? 0,
          distance: req.user.distance ?? 0,
          lifetimeSteps: req.user.lifetimeSteps ?? 0,
          lifetimeDistance: req.user.lifetimeDistance ?? 0,
        });
      }
    }

    if (normalizedUsers.length === 0) {
      const fallback = await fetchGlobalLeaderboard(10);
      return res.json({ success: true, data: fallback });
    }

    const territoryStats = await Territory.aggregate([
      { $match: { owner: { $in: normalizedUsers.map((u) => u._id) } } },
      {
        $group: {
          _id: "$owner",
          totalArea: { $sum: { $ifNull: ["$metrics.area", 0] } },
          territoryCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = territoryStats.reduce((acc, stat) => {
      acc[stat._id.toString()] = {
        totalArea: stat.totalArea ?? 0,
        territoryCount: stat.territoryCount ?? 0,
      };
      return acc;
    }, {});

    const leaderboard = normalizedUsers
      .map((user) => {
        const key = user._id?.toString?.() ?? user._id;
        const stat = statsMap[key] ?? { totalArea: 0, territoryCount: 0 };
        return {
          userId: key,
          username: user.username,
          avatar: user.avatar ?? null,
          city: user.city ?? null,
          steps: user.steps ?? 0,
          distance: user.distance ?? 0,
          lifetimeSteps: user.lifetimeSteps ?? 0,
          lifetimeDistance: user.lifetimeDistance ?? 0,
          totalArea: stat.totalArea,
          territoryCount: stat.territoryCount,
        };
      })
      .sort((a, b) => {
        if ((b.totalArea ?? 0) !== (a.totalArea ?? 0)) {
          return (b.totalArea ?? 0) - (a.totalArea ?? 0);
        }
        return (b.steps ?? 0) - (a.steps ?? 0);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
