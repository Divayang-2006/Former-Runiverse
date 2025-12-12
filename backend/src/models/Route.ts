import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IRoute {
  creatorId: Types.ObjectId;
  name: string;
  description?: string | null;
  distance: number;
  elevationGain: number;
  popularityScore: number;
  isPublic: boolean;
  loop: boolean;
  boundingBox?: Record<string, unknown> | null;
  simplifiedPath?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RouteDocument = HydratedDocument<IRoute>;
export type RouteModel = Model<IRoute>;

const routeSchema = new Schema<IRoute, RouteModel>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 4000 },
    distance: { type: Number, required: true, min: 0 },
    elevationGain: { type: Number, required: true, min: 0 },
    popularityScore: { type: Number, default: 0, min: 0 },
    isPublic: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },
    boundingBox: { type: Schema.Types.Mixed, default: null },
    simplifiedPath: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

routeSchema.index({ creatorId: 1, isPublic: 1 });
routeSchema.index({ popularityScore: -1 });
routeSchema.index({ isPublic: 1, popularityScore: -1 });

const Route = (mongoose.models.Route as RouteModel | undefined) ?? mongoose.model<IRoute, RouteModel>("Route", routeSchema);

export default Route;
