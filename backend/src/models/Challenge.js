import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  goal: { type: Number, required: true },
  type: { type: String, enum: ["steps", "distance"], required: true },
  isDaily: { type: Boolean, default: false },
  isWeekly: { type: Boolean, default: false },
  startDate: Date,
  endDate: Date,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  progress: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      currentProgress: { type: Number, default: 0 },
      completed: { type: Boolean, default: false },
    },
  ],
}, { timestamps: true });

export default mongoose.model("Challenge", challengeSchema);
