"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface AnimationCard {
  id: string;
  cardId: string;
  imageUrl: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function useAnimation() {
  const [animatingCards, setAnimatingCards] = useState<AnimationCard[]>([]);
  const idCounterRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerCardAnimation = useCallback(
    (
      cardId: string,
      imageUrl: string,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ): string => {
      const id = `anim-${idCounterRef.current++}`;
      const newCard: AnimationCard = {
        id,
        cardId,
        imageUrl,
        startX,
        startY,
        endX,
        endY,
      };

      setAnimatingCards((prev) => [...prev, newCard]);

      // Remove the card after animation completes (500ms)
      setTimeout(() => {
        if (mountedRef.current) {
          setAnimatingCards((prev) => prev.filter((c) => c.id !== id));
        }
      }, 500);

      return id;
    },
    [],
  );

  return {
    animatingCards,
    triggerCardAnimation,
  };
}
