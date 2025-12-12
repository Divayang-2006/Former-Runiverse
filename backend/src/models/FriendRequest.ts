import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface IFriendRequest {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FriendRequestDocument = HydratedDocument<IFriendRequest>;
export type FriendRequestModel = Model<IFriendRequest>;

const friendRequestSchema = new Schema<IFriendRequest, FriendRequestModel>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
friendRequestSchema.path("receiverId").validate(function (this: FriendRequestDocument, value: Types.ObjectId) {
  return !this.senderId.equals(value);
}, "Cannot send friend request to oneself");

const FriendRequest =
  (mongoose.models.FriendRequest as FriendRequestModel | undefined) ??
  mongoose.model<IFriendRequest, FriendRequestModel>("FriendRequest", friendRequestSchema);

export default FriendRequest;
