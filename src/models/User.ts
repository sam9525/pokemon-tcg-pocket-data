import { InferSchemaType, model, models, Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    image: { type: String },
    provider: { type: String, default: "credentials" },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = models?.User || model("User", UserSchema);

// Export the document type
export type UserDocument = InferSchemaType<typeof UserSchema> & Document;
