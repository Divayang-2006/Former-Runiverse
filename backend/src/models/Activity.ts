import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IActivity {
  userId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  totalDistance: number;
  calories: number;
  avgSpeed: number;
  activityType: string;
  loopDetected: boolean;
  hexesVisited: string[];
  detectedRoutes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityDocument = HydratedDocument<IActivity>;
export type ActivityModel = Model<IActivity>;

const activitySchema = new Schema<IActivity, ActivityModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: ActivityDocument, value: Date) {
          return !this.startTime || value >= this.startTime;
        },
        message: "endTime must be greater than or equal to startTime",
      },
    },
    totalDistance: { type: Number, required: true, min: 0 },
    calories: { type: Number, required: true, min: 0 },
    avgSpeed: { type: Number, required: true, min: 0 },
    activityType: { type: String, required: true, trim: true, maxlength: 64 },
    loopDetected: { type: Boolean, default: false },
    hexesVisited: {
      type: [String],
      default: [],
      validate: {
        validator: (values: unknown[]) => Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
        message: "hexesVisited must contain valid hex identifiers",
      },
    },
    detectedRoutes: {
      type: [Schema.Types.ObjectId],
      ref: "Route",
      default: [],
    },
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, startTime: -1 });
activitySchema.index({ "hexesVisited": 1 });
activitySchema.index({ activityType: 1, startTime: -1 });

const Activity = (mongoose.models.Activity as ActivityModel | undefined) ?? mongoose.model<IActivity, ActivityModel>("Activity", activitySchema);

export default Activity;
