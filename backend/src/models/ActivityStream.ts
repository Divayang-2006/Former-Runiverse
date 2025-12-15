import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IActivityStream {
  activityId: Types.ObjectId;
  gps?: Record<string, unknown> | null;
  heartRate?: Record<string, unknown> | null;
  steps?: Record<string, unknown> | null;
  pace?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityStreamDocument = HydratedDocument<IActivityStream>;
export type ActivityStreamModel = Model<IActivityStream>;

const activityStreamSchema = new Schema<IActivityStream, ActivityStreamModel>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: "Activity", required: true, unique: true },
    gps: { type: Schema.Types.Mixed, default: null },
    heartRate: { type: Schema.Types.Mixed, default: null },
    steps: { type: Schema.Types.Mixed, default: null },
    pace: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

const ActivityStream =
  (mongoose.models.ActivityStream as ActivityStreamModel | undefined) ??
  mongoose.model<IActivityStream, ActivityStreamModel>("ActivityStream", activityStreamSchema);

export default ActivityStream;
