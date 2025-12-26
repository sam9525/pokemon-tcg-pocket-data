import { model, models, Schema, Model } from "mongoose";

export interface ICard {
  cardName: string;
  cardCount: number;
  boosterPack?: string;
}

export interface IDeckList {
  package: string;
  deckName: string;
  count: number;
  highlight: ICard[];
  cardList: Record<string, ICard[]>;
  deckListHash: string;
}

const CardSchema = new Schema<ICard>(
  {
    cardName: { type: String, required: true },
    cardCount: { type: Number, required: true },
    boosterPack: { type: String },
  },
  { _id: false }
);

const DeckListSchema = new Schema<IDeckList>({
  package: { type: String, required: true },
  deckName: { type: String, required: true },
  count: { type: Number, required: true },
  highlight: { type: [CardSchema], required: true },
  cardList: { type: Object, required: true },
  deckListHash: { type: String, required: true, unique: true },
});

// Add index for package to optimize queries
DeckListSchema.index({ package: 1 });

export const DeckList =
  (models?.DeckList as Model<IDeckList>) ||
  model<IDeckList>("DeckList", DeckListSchema);
