import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IClubMember {
  clubId: Types.ObjectId;
  userId: Types.ObjectId;
  role: string;
  joinedAt: Date;
}

export type ClubMemberDocument = HydratedDocument<IClubMember>;
export type ClubMemberModel = Model<IClubMember>;

const clubMemberSchema = new Schema<IClubMember, ClubMemberModel>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, default: "member", trim: true, maxlength: 64 },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

clubMemberSchema.index({ clubId: 1, userId: 1 }, { unique: true });

const ClubMember =
  (mongoose.models.ClubMember as ClubMemberModel | undefined) ??
  mongoose.model<IClubMember, ClubMemberModel>("ClubMember", clubMemberSchema);

export default ClubMember;
