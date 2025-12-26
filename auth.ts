import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/zod";
import { User } from "@/models/User";
import GoogleProvider from "next-auth/providers/google";
import { verifyPassword } from "@/utils/password";
import connectDB from "@/lib/mongodb";

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

          // connect to mongodb
          await connectDB();

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
          // connect to mongodb
          await connectDB();

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
    // After using google to log in, check if the user is an admin
    // If yes, add true to isAdmin in token
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          await connectDB();
          if (user.email) {
            const dbUser = await User.findOne({ email: user.email });
            token.isAdmin = dbUser?.isAdmin || false;
          }
        } else {
          token.isAdmin = user.isAdmin || false;
        }
      }
      return token;
    },
    // Add isAdmin to session
    async session({ session, token }) {
      // Add user ID to session if available
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (token.isAdmin !== undefined) {
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
  },
  debug: true, // Enable debug mode to get more detailed error information
});
