import { User } from "@/models/User";
import connectDB from "@/lib/mongodb";

export async function GET() {
  // Connect to MongoDB
  await connectDB();

  // Find all users
  const users = await User.find({});

  return Response.json({ users });
}
