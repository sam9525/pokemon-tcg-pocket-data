import { model, models, Schema } from "mongoose";

const packageSchema = new Schema({
  code: { type: String, required: true },
  language: { type: String, required: true },
  inDatabase: { type: Boolean, default: false },
});

export const Package = models?.Package || model("Package", packageSchema);
