import { model, models, Schema } from "mongoose";

export interface IDeckCard {
  cardId: string; // Includes language prefix, e.g. "A1_ja_001"
  quantity: number; // 1 or 2 (enforced in validation)
}

export interface IUserDeck {
  userId: Schema.Types.ObjectId; // References User._id
  name: string;
  cards: IDeckCard[];
}

const DeckCardSchema = new Schema<IDeckCard>(
  {
    cardId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 2 },
  },
  { _id: false },
);

const UserDeckSchema = new Schema<IUserDeck>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    name: { type: String, required: true },
    cards: { type: [DeckCardSchema], default: [] },
  },
  { timestamps: true },
);

// Index for user's decks lookup, sorted by creation date
UserDeckSchema.index({ userId: 1, createdAt: -1 });

export const UserDeck =
  models?.UserDeck || model<IUserDeck>("UserDeck", UserDeckSchema);
