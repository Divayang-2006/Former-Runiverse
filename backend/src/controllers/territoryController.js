import Territory from "../models/Territory.js";

export const claimTerritory = async (req, res) => {
  try {
    const { coordinates, name, area, length } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({ success: false, message: "Polygon coordinates are required" });
    }

    const metrics = {
      area: typeof area === "number" ? area : null,
      length: typeof length === "number" ? length : null,
    };

    const territory = await Territory.create({
      owner: req.user?._id ?? null,
      location: { type: "Polygon", coordinates },
      name: name?.trim() || "Unnamed Territory",
      claimedOn: new Date(),
      metrics,
    });
    res.json({ success: true, data: territory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTerritories = async (_req, res) => {
  try {
    const territories = await Territory.find()
      .populate("owner", "username avatarUrl avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: territories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
