import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IFollowRelation {
  followerId: Types.ObjectId;
  followingId: Types.ObjectId;
  createdAt: Date;
}

export type FollowRelationDocument = HydratedDocument<IFollowRelation>;
export type FollowRelationModel = Model<IFollowRelation>;

const followRelationSchema = new Schema<IFollowRelation, FollowRelationModel>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

followRelationSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followRelationSchema.path("followingId").validate(function (this: FollowRelationDocument, value: Types.ObjectId) {
  return !this.followerId.equals(value);
}, "Users cannot follow themselves");

const FollowRelation =
  (mongoose.models.FollowRelation as FollowRelationModel | undefined) ??
  mongoose.model<IFollowRelation, FollowRelationModel>("FollowRelation", followRelationSchema);

export default FollowRelation;
