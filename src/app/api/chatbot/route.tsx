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
            model: "gemini-2.5-flash",
            contents: msg,
            config: {
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
