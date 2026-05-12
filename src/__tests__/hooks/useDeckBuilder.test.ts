import { renderHook, act } from "@testing-library/react";
import { useDeckBuilder } from "@/hooks/useDeckBuilder";

describe("useDeckBuilder", () => {
  it("starts with empty deck", () => {
    const { result } = renderHook(() => useDeckBuilder());
    expect(result.current.deck.name).toBe("");
    expect(result.current.deck.cards).toEqual([]);
    expect(result.current.validation.canSave).toBe(false);
  });

  it("adds a new card", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    expect(result.current.deck.cards).toHaveLength(1);
    expect(result.current.deck.cards[0]).toEqual({
      cardId: "A1_001",
      quantity: 1,
    });
  });

  it("increments quantity when adding duplicate card", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.addCard("A1_001"));
    expect(result.current.deck.cards).toHaveLength(1);
    expect(result.current.deck.cards[0].quantity).toBe(2);
  });

  it("blocks adding 3rd copy", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.addCard("A1_001"));
    const addResult = act(() => result.current.addCard("A1_001"));
    expect(addResult.success).toBe(false);
    expect(addResult.reason).toContain("2 copies");
    expect(result.current.deck.cards[0].quantity).toBe(2);
  });

  it("removes one copy on removeCard", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.removeCard("A1_001"));
    expect(result.current.deck.cards[0].quantity).toBe(1);
  });

  it("removes card when quantity reaches 0", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.removeCard("A1_001"));
    expect(result.current.deck.cards).toHaveLength(0);
  });

  it("removes all copies on removeAllCopies", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.removeAllCopies("A1_001"));
    expect(result.current.deck.cards).toHaveLength(0);
  });

  it("clears deck", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.clearDeck());
    expect(result.current.deck.cards).toHaveLength(0);
    expect(result.current.deck.name).toBe("");
  });

  it("loads a saved deck", () => {
    const { result } = renderHook(() => useDeckBuilder());
    const savedDeck = {
      id: "deck123",
      name: "My Deck",
      cards: [{ cardId: "A1_001", quantity: 2 }],
    };
    act(() => result.current.loadDeck(savedDeck));
    expect(result.current.deck.id).toBe("deck123");
    expect(result.current.deck.name).toBe("My Deck");
    expect(result.current.deck.cards).toHaveLength(1);
    expect(result.current.validation.canSave).toBe(true);
  });

  it("updates name and validates", () => {
    const { result } = renderHook(() => useDeckBuilder());
    act(() => result.current.addCard("A1_001"));
    act(() => result.current.setDeckName("Test Deck"));
    expect(result.current.deck.name).toBe("Test Deck");
    expect(result.current.validation.canSave).toBe(true);
  });
});
