import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  type: {
    type: String,
    enum: ["run", "walk", "capture", "streak"],
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  generatedByAI: { type: Boolean, default: false },
});

// ✅ Helper methods
taskSchema.methods.markCompleted = async function () {
  this.completed = true;
  await this.save();
};

taskSchema.methods.isExpired = function () {
  return this.expiresAt && this.expiresAt < new Date();
};

const Task = mongoose.model("Task", taskSchema);
export default Task;