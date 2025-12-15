import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IClub {
  name: string;
  description?: string | null;
  ownerId: Types.ObjectId;
  searchKeywords: string[];
  createdAt: Date;
}

export type ClubDocument = HydratedDocument<IClub>;
export type ClubModel = Model<IClub>;

const clubSchema = new Schema<IClub, ClubModel>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 4000 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    searchKeywords: {
      type: [String],
      default: [],
      validate: {
        validator: (value: unknown[]) => Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim().length > 0),
        message: "searchKeywords must be non-empty strings",
      },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

clubSchema.index({ ownerId: 1, name: 1 }, { unique: true });
clubSchema.index({ searchKeywords: 1 });
clubSchema.index({ name: "text", description: "text", searchKeywords: "text" });

const Club = (mongoose.models.Club as ClubModel | undefined) ?? mongoose.model<IClub, ClubModel>("Club", clubSchema);

export default Club;
