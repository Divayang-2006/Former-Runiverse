import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IRouteSegment {
  routeId: Types.ObjectId;
  segmentIndex: number;
  coordinates: Record<string, unknown> | unknown[];
}

export type RouteSegmentDocument = HydratedDocument<IRouteSegment>;
export type RouteSegmentModel = Model<IRouteSegment>;

const routeSegmentSchema = new Schema<IRouteSegment, RouteSegmentModel>(
  {
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    segmentIndex: { type: Number, required: true, min: 0 },
    coordinates: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: false }
);

routeSegmentSchema.index({ routeId: 1, segmentIndex: 1 }, { unique: true });

const RouteSegment =
  (mongoose.models.RouteSegment as RouteSegmentModel | undefined) ??
  mongoose.model<IRouteSegment, RouteSegmentModel>("RouteSegment", routeSegmentSchema);

export default RouteSegment;
