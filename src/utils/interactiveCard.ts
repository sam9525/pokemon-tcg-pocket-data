import { MouseEvent } from "react";

export const handleClick = <T extends HTMLElement>(
  cardId: string,
  cardMap: Map<string, T>,
  packageId?: string
) => {
  const card = cardMap.get(cardId);
  if (!card) return;

  // Toggle focus class - add if not present, remove if already present
  if (card.classList.contains("focus")) {
    // Remove focus with animation
    card.classList.add("unfocus");
    setTimeout(() => {
      card.classList.remove("focus", "unfocus");
      // Remove mask when card is unfocused
      document.getElementById("background-mask")?.remove();
      window.history.pushState(null, "", `/cards/${packageId}`);
    }, 300); // Match the transition duration
  } else {
    // Remove focus from any other cards first
    document.querySelectorAll(".card-container > div.focus").forEach((el) => {
      el.classList.remove("focus");
    });

    // Calculate the card's position relative to the viewport
    const rect = card.getBoundingClientRect();

    // Calculate the position as a percentage of the viewport
    // We need to account for the card's center point
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Set CSS variables for the animation
    card.style.setProperty("--start-x", `${startX}px`);
    card.style.setProperty("--start-y", `${startY}px`);

    // Add focus to the clicked card
    card.classList.add("focus");

    const basePath = packageId ? `/cards/${packageId}` : "/search";

    // Create and add background mask
    const mask = document.createElement("div");
    mask.id = "background-mask";

    // Remove focus and mask when clicked again
    mask.addEventListener("click", () => {
      card.classList.add("unfocus");
      setTimeout(() => {
        card.classList.remove("focus", "unfocus");
        mask.remove();
        window.history.pushState(null, "", `${basePath}`);
      }, 300);
    });

    document.body.appendChild(mask);

    window.history.pushState(null, "", `${basePath}/${cardId}`);
  }
  return;
};

export const handleMove = <T extends HTMLElement>(
  e: MouseEvent<T>,
  cardId: string,
  cardMap: Map<string, T>
) => {
  const card = cardMap.get(cardId);
  if (!card) return;
  // onMouseMove(e as unknown as MouseEvent<HTMLElement>, card);
  const cardImage = card.querySelector("img");

  const rect = card.getBoundingClientRect();
  const height = rect.height;
  const width = rect.width;

  // Calculate mouse position relative to the card
  const xVal = e.clientX - rect.left;
  const yVal = e.clientY - rect.top;

  const xRotation = -20 * ((yVal - height / 2) / height);
  const yRotation = 20 * ((xVal - width / 2) / width);

  const transformString = `perspective(500px) rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;

  card.style.transform = transformString + " scale(1.1)";
  if (!cardImage) return;
  cardImage.style.transform = transformString;
};

export const handleMouseOut = <T extends HTMLElement>(
  cardId: string,
  cardMap: Map<string, T>
) => {
  const card = cardMap.get(cardId);
  if (!card) return;
  // onMouseOut(card);
  const cardImage = card.querySelector("img");

  const transformString = "perspective(500px) scale(1) rotateX(0) rotateY(0)";

  card.style.transform = transformString;
  if (!cardImage) return;
  cardImage.style.transform = transformString;
};

export const handleMouseUp = <T extends HTMLElement>(
  cardId: string,
  cardMap: Map<string, T>
) => {
  const card = cardMap.get(cardId);
  if (!card) return;
  // onMouseUp(card);
  const cardImage = card.querySelector("img");

  const transformString = "perspective(500px) rotateX(0) rotateY(0)";

  card.style.transform = transformString + " scale(1.1)";
  if (!cardImage) return;
  cardImage.style.transform = transformString;
};
