/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { UserDeck } from "@/models/UserDeck";
import { User } from "@/models/User";
import { validateDeck } from "@/lib/deckValidation";
import { rateLimit } from "@/lib/rateLimit";
import { DECK_CREATE_RATE_LIMIT } from "@/utils/rateLimitConfig";

const MAX_DECKS_PER_USER = 30;

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

    const decks = (await UserDeck.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("name cards updatedAt createdAt source")
      .lean()) as any;

    const plainDecks = decks.map((deck: any) => ({
      _id: deck._id.toString(),
      name: deck.name,
      cards: deck.cards,
      source: deck.source,
      createdAt: deck.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: deck.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ decks: plainDecks });
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

    const rateLimitResult = await rateLimit(request, DECK_CREATE_RATE_LIMIT);
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { name, cards, source } = body;

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

    const validation = validateDeck(cards, name);
    if (!validation.canSave) {
      return NextResponse.json(
        { error: validation.saveErrors[0] ?? "Invalid deck" },
        { status: 400 },
      );
    }

    await connectDB();

    // Look up userId from email and atomically reserve a deck slot.
    // The conditional filter (`deckCount: { $lt: 30 }`) ensures only one
    // concurrent POST can pass the gate, even under race conditions.
    const updatedUser = (await User.findOneAndUpdate(
      { email: session.user.email, deckCount: { $lt: MAX_DECKS_PER_USER } },
      { $inc: { deckCount: 1 } },
      { new: true },
    )) as any;

    if (!updatedUser?._id) {
      return NextResponse.json(
        { error: `Maximum deck limit (${MAX_DECKS_PER_USER}) reached` },
        { status: 400 },
      );
    }

    try {
      const newDeck = await UserDeck.create({
        userId: updatedUser._id,
        name: name.trim(),
        cards: cards.map((c: { cardId: string; quantity: number }) => ({
          cardId: c.cardId,
          quantity: Math.min(c.quantity, 2), // Cap at 2 copies
        })),
        source: source || "builder",
      });
      return NextResponse.json({ deck: newDeck }, { status: 201 });
    } catch (createError) {
      // Compensate for the failed insert by rolling back the counter.
      await User.findOneAndUpdate(
        { _id: updatedUser._id },
        { $inc: { deckCount: -1 } },
      );
      throw createError;
    }
  } catch (error) {
    console.error("[user-decks:POST]", error);
    return NextResponse.json(
      { error: "Failed to create deck" },
      { status: 500 },
    );
  }
}
