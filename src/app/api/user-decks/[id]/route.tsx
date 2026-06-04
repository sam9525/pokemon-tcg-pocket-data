/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { UserDeck } from "@/models/UserDeck";
import { User } from "@/models/User";
import { validateDeck } from "@/lib/deckValidation";

// GET /api/user-decks/[id] - Get a single deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as any;
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deck = (await UserDeck.findOne({
      _id: id,
      userId: user._id,
    }).lean()) as any;

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ deck });
  } catch (error) {
    console.error("[user-decks/[id]:GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch deck" },
      { status: 500 },
    );
  }
}

// PUT /api/user-decks/[id] - Update a deck
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, cards, version } = body;

    if (version === undefined) {
      return NextResponse.json(
        { error: "Version is required for updates", code: "VERSION_REQUIRED" },
        { status: 400 },
      );
    }

    await connectDB();

    // Look up userId from email for ownership check
    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as any;
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check existence first to distinguish not-found from version conflict
    const existingDeck = (await UserDeck.findOne({
      _id: id,
      userId: user._id,
    }).lean()) as any;
    if (!existingDeck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Cap incoming quantities FIRST so validateDeck sees the persisted shape.
    // Without this, validateDeck would pass on uncapped data and we'd store
    // a different (capped) shape, creating drift between validation and storage.
    const incomingCards = Array.isArray(cards)
      ? cards.map((c: { cardId: string; quantity: number }) => ({
          cardId: c.cardId,
          quantity: Math.min(c.quantity, 2),
        }))
      : existingDeck.cards;

    const finalCards = cards !== undefined ? incomingCards : existingDeck.cards;
    const finalName = name !== undefined ? name.trim() : existingDeck.name;
    const validation = validateDeck(finalCards, finalName);
    if (!validation.canSave) {
      return NextResponse.json(
        { error: validation.saveErrors[0] ?? "Invalid deck" },
        { status: 400 },
      );
    }

    // Optimistic locking: only update if version matches
    const deck = await UserDeck.findOneAndUpdate(
      { _id: id, userId: user._id, version },
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(cards !== undefined && { cards: incomingCards }),
        },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!deck) {
      return NextResponse.json(
        {
          error: "Conflict: deck was modified by another user",
          code: "VERSION_MISMATCH",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ deck });
  } catch (error) {
    console.error("[user-decks/[id]:PUT]", error);
    return NextResponse.json(
      { error: "Failed to update deck" },
      { status: 500 },
    );
  }
}

// DELETE /api/user-decks/[id] - Delete a deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Look up userId from email for ownership check
    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as any;
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await UserDeck.deleteOne({ _id: id, userId: user._id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Keep the user's deckCount in sync with actual ownership so the deck
    // limit reflects reality. The `deckCount: { $gt: 0 }` guard prevents the
    // counter from going negative if pre-existing drift left it at 0.
    await User.updateOne(
      { _id: user._id, deckCount: { $gt: 0 } },
      { $inc: { deckCount: -1 } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[user-decks/[id]:DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete deck" },
      { status: 500 },
    );
  }
}
