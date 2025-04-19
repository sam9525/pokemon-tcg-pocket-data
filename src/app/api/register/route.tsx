import { registerSchema } from "@/lib/zod";
import mongoose from "mongoose";
import { ZodError } from "zod";
import bcryptjs from "bcryptjs";
import { User } from "@/app/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const confirmPassword = body.confirmPassword;

    // Connecting to database
    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

    // Parsing the body
    const { name, email, password } = await registerSchema.parseAsync(body);

    // Check if user is exist
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Salt and hash the password
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    // Create the user
    const createdUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Return success response (without password)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: createdUser._id.toString(),
          name: createdUser.name,
          email: createdUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
