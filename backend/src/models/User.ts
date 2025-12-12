import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string;
  mobileNumber?: string | null;
  displayName?: string;
  avatar?: string | null;
  bio?: string | null;
  searchKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;

const userSchema = new Schema<IUser, UserModel>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 64 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    password: { type: String, required: true, minlength: 8 },
    mobileNumber: {
      type: String,
      default: null,
      trim: true,
      match: [/^\d{10}$/, "mobileNumber must be exactly 10 digits"],
    },
    displayName: { type: String, trim: true, maxlength: 128 },
    avatar: { type: String, default: null },
    bio: { type: String, default: null, maxlength: 4000 },
    searchKeywords: {
      type: [String],
      default: [],
      validate: {
        validator: (value: unknown[]) => Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim().length > 0),
        message: "searchKeywords must be non-empty strings",
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ searchKeywords: 1 });
userSchema.index({ username: "text", displayName: "text", bio: "text", searchKeywords: "text" });

const User = (mongoose.models.User as UserModel | undefined) ?? mongoose.model<IUser, UserModel>("User", userSchema);

export default User;
