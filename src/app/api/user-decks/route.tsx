/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { UserDeck } from "@/models/UserDeck";
import { User } from "@/models/User";

// GET /api/user-decks - Get all decks for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Look up userId from email
    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as any;
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const decks = await UserDeck.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("name cards updatedAt createdAt")
      .lean();

    return NextResponse.json({ decks });
  } catch (error) {
    console.error("[user-decks:GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 },
    );
  }
}

// POST /api/user-decks - Create a new deck
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, cards } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Deck name is required" },
        { status: 400 },
      );
    }
    if (!cards?.length) {
      return NextResponse.json(
        { error: "Deck must have at least one card" },
        { status: 400 },
      );
    }

    await connectDB();

    // Look up userId from email
    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as any;
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newDeck = await UserDeck.create({
      userId: user._id,
      name: name.trim(),
      cards: cards.map((c: { cardId: string; quantity: number }) => ({
        cardId: c.cardId,
        quantity: Math.min(c.quantity, 2), // Cap at 2 copies
      })),
    });

    return NextResponse.json({ deck: newDeck }, { status: 201 });
  } catch (error) {
    console.error("[user-decks:POST]", error);
    return NextResponse.json(
      { error: "Failed to create deck" },
      { status: 500 },
    );
  }
}
