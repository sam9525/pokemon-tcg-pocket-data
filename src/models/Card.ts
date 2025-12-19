import { model, models, Schema } from "mongoose";

const CardSchema = new Schema(
  {
    cardId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    package: { type: String, required: true },
    boosterPack: { type: [String], required: true },
    trainer: { type: String, required: true },
    rarity: { type: String, required: true },
    specialEffect: { type: String, required: true },
    fightEnergy: { type: String, required: true },
    weakness: { type: String, required: true },
    language: { type: String, required: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

// Create a unique index for cardId and package
CardSchema.index({ cardId: 1, package: 1 }, { unique: true });

export const Card = models?.Card || model("Card", CardSchema);
