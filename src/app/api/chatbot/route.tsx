import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI as string,
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { msg } = await req.json();

    if (!msg || typeof msg !== "string") {
      return Response.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Get response from AI
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: msg,
    });

    const aiMessage =
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0] &&
      typeof response.candidates[0].content.parts[0].text === "string"
        ? response.candidates[0].content.parts[0].text
        : "";

    return Response.json({ aiMessage });
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
