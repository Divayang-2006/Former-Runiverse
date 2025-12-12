import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface ISavedRoute {
  userId: Types.ObjectId;
  routeId: Types.ObjectId;
  savedAt: Date;
}

export type SavedRouteDocument = HydratedDocument<ISavedRoute>;
export type SavedRouteModel = Model<ISavedRoute>;

const savedRouteSchema = new Schema<ISavedRoute, SavedRouteModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    savedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

savedRouteSchema.index({ userId: 1, routeId: 1 }, { unique: true });

const SavedRoute =
  (mongoose.models.SavedRoute as SavedRouteModel | undefined) ??
  mongoose.model<ISavedRoute, SavedRouteModel>("SavedRoute", savedRouteSchema);

export default SavedRoute;
