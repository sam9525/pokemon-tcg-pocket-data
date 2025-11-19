import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI as string,
});

export async function POST(req: NextRequest) {
  try {
    const { msg } = await req.json();

    if (!msg || typeof msg !== "string") {
      return Response.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Get streaming response from Gemini
          const response = await ai.models.generateContentStream({
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
              tools: [
                {
                  googleSearch: {},
                },
              ],
            },
          });

          // Stream each chunk in SSE format
          for await (const chunk of response) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

            if (text) {
              // Send chunk in SSE format: "data: {json}\n\n"
              const data = `data: ${JSON.stringify({ text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          // Send error in SSE format
          const errorData = `data: ${JSON.stringify({
            error: "Streaming failed",
            details: error instanceof Error ? error.message : String(error),
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    // Return stream with SSE headers
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
      {
        error: "Failed to get response from AI.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
