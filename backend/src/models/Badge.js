import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  iconUrl: String,
});

const Badge = mongoose.model("Badge", badgeSchema);
export default Badge;
