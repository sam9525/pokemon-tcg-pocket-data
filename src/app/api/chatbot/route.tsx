import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";

const AI_TIMEOUT_MS = 30_000;
const MAX_BODY_SIZE = 64 * 1024; // 64 KB
const MAX_MSG_LENGTH = 4000;

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI as string,
});

export async function POST(req: NextRequest) {
  // Body-size cap: reject oversize requests before parsing JSON.
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  // Rate-limit before any work.
  const rl = await rateLimit(req, API_RATE_LIMIT);
  if (!rl.success) return rl.response;

  // Require an authenticated session.
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { msg } = await req.json();

    if (!msg || typeof msg !== "string") {
      return Response.json(
        { error: "Invalid message format" },
        { status: 400 },
      );
    }
    if (msg.length > MAX_MSG_LENGTH) {
      return Response.json(
        { error: `Message exceeds ${MAX_MSG_LENGTH} characters` },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const stream = new ReadableStream({
      async start(streamController) {
        const encoder = new TextEncoder();
        try {
          const response = await ai.models.generateContentStream(
            {
              model: "gemini-3-pro-preview",
              contents: msg,
              config: {
                systemInstruction: `You are an expert Pokémon TCG Pocket strategist and deck builder. Your goal is to provide precise, tournament-level deck lists based on the current game meta.

              Whenever the user asks for a deck recommendation or specific deck details, you must follow these strict guidelines:

              1.  **Deck Composition:** Always provide a complete, legal 20-card deck list suitable for the specific archetype requested.
              2.  **Source Identification:** For every single card listed, you must identify its specific origin (e.g., "Genetic Apex," "Mega Rising," "Promo-A," or "Space-Time Smackdown"). Distinguish between standard expansion cards and Promo cards.
              3.  **Formatting:** Present the deck list strictly as a Markdown table with the following three columns:
                  - **Card Name**
                  - **Count** (Ensure the total sums to 20 cards)
                  - **Booster Pack / Set**
              4.  **Categorization:** Group the table rows by "Pokémon" and "Trainers/Items" for readability.
              5.  **Strategy Summary:** Immediately following the table, provide a brief 1-2 sentence explanation of the deck's core strategy or win condition.

              If you do not know the specific set a card belongs to, use your tools to verify it before generating the table to ensure 100% accuracy.`,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 60000,
                tools: [{ googleSearch: {} }],
              },
            },
            { signal: controller.signal },
          );

          for await (const chunk of response) {
            const links =
              chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              const data = `data: ${JSON.stringify({ text })}\n\n`;
              streamController.enqueue(encoder.encode(data));
            }
            if (links != undefined) {
              const data = `links: ${JSON.stringify({ links })}\n\n`;
              streamController.enqueue(encoder.encode(data));
            }
          }
          streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            const errorData = `data: ${JSON.stringify({
              error: "Request timeout",
              details:
                "The AI request timed out after 30 seconds. Please try again.",
            })}\n\n`;
            streamController.enqueue(encoder.encode(errorData));
          } else {
            const errorData = `data: ${JSON.stringify({
              error: "Streaming failed",
              details: "An error occurred. Please try again.",
            })}\n\n`;
            streamController.enqueue(encoder.encode(errorData));
          }
        } finally {
          clearTimeout(timeoutId);
          streamController.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return Response.json(
      { error: "Failed to get response from AI." },
      { status: 500 },
    );
  }
}
