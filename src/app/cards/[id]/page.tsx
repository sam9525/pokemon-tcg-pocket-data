"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { use } from "react";
import Image from "next/image";

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch(`/api/cards/${resolvedParams.id}`);
        const data = await response.json();
        setFiles(data.files || []);

        if (response.ok) {
          resolve(response);
        } else {
          reject(response);
        }
      });

      toast.promise(toastPromise, {
        loading: "Loading packages...",
        error: "Failed to load packages",
      });
    } catch (error) {
      console.error(error);
    }
  }, [resolvedParams.id]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const height = rect.height;
    const width = rect.width;

    // Calculate mouse position relative to the card
    const xVal = e.clientX - rect.left;
    const yVal = e.clientY - rect.top;

    const xRotation = -20 * ((yVal - height / 2) / height);
    const yRotation = 20 * ((xVal - width / 2) / width);

    const transformString = `perspective(500px) scale(1.1) rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
    card.style.transform = transformString;
  };

  const handleMouseOut = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;

    card.style.transform = "perspective(500px) scale(1) rotateX(0) rotateY(0)";
  };

  const handleMouseUp = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;

    card.style.transform =
      "perspective(500px) scale(1.1) rotateX(0) rotateY(0)";
  };

  const handleClick = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;

    // Toggle focus class - add if not present, remove if already present
    if (card.classList.contains("focus")) {
      // Remove focus with animation
      card.classList.add("unfocus");
      setTimeout(() => {
        card.classList.remove("focus", "unfocus");
        // Remove mask when card is unfocused
        document.getElementById("background-mask")?.remove();
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

      // Create and add background mask
      const mask = document.createElement("div");
      mask.id = "background-mask";

      // Remove focus and mask when clicked again
      mask.addEventListener("click", () => {
        card.classList.add("unfocus");
        setTimeout(() => {
          card.classList.remove("focus", "unfocus");
          mask.remove();
        }, 300);
      });

      document.body.appendChild(mask);
    }
    return;
  };

  return (
    <div className="flex flex-col items-center justify-center m-10">
      <div className="grid grid-cols-6 gap-10">
        {files.map((file) => (
          <div
            key={file.id}
            className="card-container"
            onMouseMove={(e) => handleMove(e, file.id)}
            onMouseOut={() => handleMouseOut(file.id)}
            onMouseUp={() => handleMouseUp(file.id)}
            onClick={() => handleClick(file.id)}
          >
            <div
              ref={(el) => {
                if (el) cardRefs.current.set(file.id, el);
              }}
              className="card"
            >
              <Image src={file.url} alt={file.id} width={200} height={280} />
              <Image
                src="https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png"
                alt="card-backside"
                width={200}
                height={280}
                className="card-backside"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
