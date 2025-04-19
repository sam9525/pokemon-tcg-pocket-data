import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/zod";
import mongoose from "mongoose";
import { User } from "@/app/models/User";
import bcryptjs from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    Credentials({
      // Specify which fields should be submitted, by adding keys to the `credentials` object.
      credentials: {
        name: {
          label: "Username",
          type: "text",
        },
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

          const passwordOk =
            user && bcryptjs.compareSync(password, user.password);

          if (passwordOk) {
            return user;
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
