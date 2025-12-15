import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface ITerritoryCell {
  hexId: string;
  ownerId?: Types.ObjectId | null;
  ownerType?: "user" | "club" | null;
  firstCapturedAt?: Date | null;
  lastCapturedAt?: Date | null;
  captureCount: number;
}

export type TerritoryCellDocument = HydratedDocument<ITerritoryCell>;
export type TerritoryCellModel = Model<ITerritoryCell>;

const territoryCellSchema = new Schema<ITerritoryCell, TerritoryCellModel>(
  {
    hexId: { type: String, required: true, unique: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ownerType: {
      type: String,
      default: null,
      validate: {
        validator(value: string | null) {
          if (value === null || value === undefined) {
            return true;
          }
          return value === "user" || value === "club";
        },
        message: "ownerType must be 'user' or 'club' when provided",
      },
    },
    firstCapturedAt: { type: Date, default: null },
    lastCapturedAt: { type: Date, default: null },
    captureCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: false }
);

territoryCellSchema.index({ ownerId: 1 });

const TerritoryCell =
  (mongoose.models.TerritoryCell as TerritoryCellModel | undefined) ??
  mongoose.model<ITerritoryCell, TerritoryCellModel>("TerritoryCell", territoryCellSchema);

export default TerritoryCell;
