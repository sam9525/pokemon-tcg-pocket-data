import { registerSchema } from "@/lib/zod";
import connectDB from "@/lib/mongodb";
import { ZodError } from "zod";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { saltAndHashPassword } from "@/utils/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const confirmPassword = body.confirmPassword;

    // Connect to MongoDB
    await connectDB();

    // Parsing the body
    const { name, email, password, image } = await registerSchema.parseAsync(
      body
    );

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
    const hashedPassword = saltAndHashPassword(password);

    // Create the user
    const createdUser = await User.create({
      name,
      email,
      password: hashedPassword,
      image,
      provider: "credentials",
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
