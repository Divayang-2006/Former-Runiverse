import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  lastName: { type: String },
  mobileNumber: { type: String },
  steps: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  lifetimeSteps: { type: Number, default: 0 },
  lifetimeDistance: { type: Number, default: 0 },
  dailyResetAt: { type: Date, default: null },
  territories: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1 },
  city: { type: String, trim: true },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
  location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: [0, 0] } },
  oauthProvider: { type: String },
  oauthId: { type: String, index: true },
  displayName: { type: String },
  avatarUrl: { type: String, default: "" },             
  avatarPublicId: { type: String, default: "" },        
  avatarProvider: { type: String, default: "cloudinary" },
}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

// Stat update methods
userSchema.methods.ensureDailyReset = function (referenceDate = new Date()) {
  const startOfDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (!this.dailyResetAt || this.dailyResetAt < startOfDay) {
    this.steps = 0;
    this.distance = 0;
    this.dailyResetAt = startOfDay;
  }
};

userSchema.methods.updateSteps = function (newSteps, referenceDate = new Date()) {
  if (!Number.isFinite(newSteps) || newSteps <= 0) {
    return this;
  }
  this.ensureDailyReset(referenceDate);
  this.steps += newSteps;
  this.lifetimeSteps += newSteps;
  return this;
};

userSchema.methods.updateDistance = function (newDistance, referenceDate = new Date()) {
  if (!Number.isFinite(newDistance) || newDistance <= 0) {
    return this;
  }
  this.ensureDailyReset(referenceDate);
  this.distance += newDistance;
  this.lifetimeDistance += newDistance;
  return this;
};
userSchema.methods.addTerritory = function () { this.territories += 1; return this.save(); };
userSchema.methods.updateStreak = function () { this.streak += 1; this.multiplier = 1 + this.streak * 0.1; return this.save(); };
userSchema.methods.resetStreak = function () { this.streak = 0; this.multiplier = 1; return this.save(); };
userSchema.methods.updateLocation = function (lng, lat) { this.location = { type: "Point", coordinates: [lng, lat] }; return this.save(); };

userSchema.methods.setAvatar = function (url, publicId, provider = "cloudinary") {
  this.avatarUrl = url;
  this.avatarPublicId = publicId;
  this.avatarProvider = provider;
  return this.save();
};

userSchema.methods.clearAvatar = function () {
  this.avatarUrl = "";
  this.avatarPublicId = "";
  this.avatarProvider = "cloudinary";
  return this.save();
};
export default mongoose.model("User", userSchema);
