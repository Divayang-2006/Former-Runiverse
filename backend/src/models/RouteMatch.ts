import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IRouteMatch {
  activityId: Types.ObjectId;
  routeId: Types.ObjectId;
  similarityScore: number;
  matchedAt: Date;
}

export type RouteMatchDocument = HydratedDocument<IRouteMatch>;
export type RouteMatchModel = Model<IRouteMatch>;

const routeMatchSchema = new Schema<IRouteMatch, RouteMatchModel>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: "Activity", required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    similarityScore: { type: Number, required: true, min: 0, max: 1 },
    matchedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

routeMatchSchema.index({ activityId: 1, routeId: 1 }, { unique: true });
routeMatchSchema.index({ matchedAt: -1 });

const RouteMatch =
  (mongoose.models.RouteMatch as RouteMatchModel | undefined) ??
  mongoose.model<IRouteMatch, RouteMatchModel>("RouteMatch", routeMatchSchema);

export default RouteMatch;
