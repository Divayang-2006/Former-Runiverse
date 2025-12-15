import mongoose from "mongoose";

const territorySchema = new mongoose.Schema({
  name: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  location: { type: { type: String, enum: ["Polygon"], default: "Polygon" }, coordinates: [[[Number]]] },
  metrics: {
    area: { type: Number, default: null },
    length: { type: Number, default: null },
  },
  claimedOn: Date,
}, { timestamps: true });

territorySchema.index({ location: "2dsphere" });

export default mongoose.model("Territory", territorySchema);
