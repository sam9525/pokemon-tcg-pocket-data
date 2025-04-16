import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/zod";
import { saltAndHashPassword } from "@/utils/password";
import mongoose from "mongoose";
import { User } from "@/app/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // Specify which fields should be submitted, by adding keys to the `credentials` object.
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "test@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = await signInSchema.parseAsync(
            credentials
          );

          // logic to salt and hash password
          const pwHash = saltAndHashPassword(password);

          await mongoose
            .connect(process.env.MONGO_URL as string)
            .catch((err) => {
              console.error("Failed to connect to MongoDB:", err);
              throw new Error("Database connection failed");
            });

          // logic to verify if the user exists
          const user = await User.findOne({ email });

          if (!user) {
            // No user found, so this is their first attempt to login
            throw new Error("Invalid credentials.");
          }

          // return user object with their profile data
          return user;
        } catch (error) {
          if (error instanceof ZodError) {
            // Return `null` to indicate that the credentials are invalid
            return null;
          }
        }
      },
    }),
  ],
});
