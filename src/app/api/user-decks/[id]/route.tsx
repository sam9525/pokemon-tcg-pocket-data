import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { UserDeck } from "@/models/UserDeck";
import { User } from "@/models/User";

// PUT /api/user-decks/[id] - Update a deck
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, cards } = body;

    await connectDB();

    // Look up userId from email for ownership check
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deck = await UserDeck.findOne({ _id: id, userId: user._id });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    if (name !== undefined) deck.name = name.trim();
    if (cards !== undefined) {
      deck.cards = cards.map((c: { cardId: string; quantity: number }) => ({
        cardId: c.cardId,
        quantity: Math.min(c.quantity, 2),
      }));
    }

    await deck.save();
    return NextResponse.json({ deck });
  } catch (error) {
    console.error("[user-decks/[id]:PUT]", error);
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 });
  }
}

// DELETE /api/user-decks/[id] - Delete a deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Look up userId from email for ownership check
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await UserDeck.deleteOne({ _id: id, userId: user._id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[user-decks/[id]:DELETE]", error);
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }
}