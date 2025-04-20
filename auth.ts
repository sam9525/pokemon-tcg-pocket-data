import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/zod";
import mongoose from "mongoose";
import { User } from "@/app/models/User";
import GoogleProvider from "next-auth/providers/google";
import { verifyPassword } from "@/utils/password";

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

          const passwordOk = verifyPassword(password, user.password);

          if (passwordOk) {
            return user;
          }

          // Return null if password doesn't match
          return null;
        } catch (error) {
          if (error instanceof ZodError) {
            // Return `null` to indicate that the credentials are invalid
            return null;
          }
          console.error("Login error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await mongoose
            .connect(process.env.MONGO_URL as string)
            .catch((err) => {
              console.error("Failed to connect to MongoDB:", err);
              throw new Error("Database connection failed");
            });

          // Check if user already exists in our custom User model
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user if they don't exist
            await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              provider: "google",
              // No password for Google users
            });
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }

      // For credentials login, we already verified in the authorize function
      return true;
    },
    async session({ session, token }) {
      // Add user ID to session if available
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  debug: true, // Enable debug mode to get more detailed error information
});
