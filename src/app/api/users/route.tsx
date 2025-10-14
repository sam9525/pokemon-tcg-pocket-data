import { User } from "@/models/User";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { RESOURCE_INTENSIVE_RATE_LIMIT } from "@/utils/rateLimitConfig";

export async function GET(request: NextRequest) {
  // Rate limiting to users list endpoint
  const rateLimitResult = await rateLimit(
    request,
    RESOURCE_INTENSIVE_RATE_LIMIT
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Connect to MongoDB
  await connectDB();

  // Find all users
  const users = await User.find({});

  return Response.json({ users });
}
