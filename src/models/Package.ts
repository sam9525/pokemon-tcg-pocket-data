import { model, models, Schema } from "mongoose";

const packageSchema = new Schema({
  code: { type: String, required: true },
  language: { type: String, required: true },
  inDatabase: { type: Boolean, default: false },
});

packageSchema.index({ code: 1, language: 1 }, { unique: true });

export const Package = models?.Package || model("Package", packageSchema);
