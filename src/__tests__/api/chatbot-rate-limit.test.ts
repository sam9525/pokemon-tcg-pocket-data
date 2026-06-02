import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({ rateLimit: rateLimitMock }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContentStream: vi.fn() },
  })),
}));

import { POST as ChatbotPOST } from "@/app/api/chatbot/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/chatbot hardening (Confirmed E)", () => {
  beforeEach(() => {
    authMock.mockReset();
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ success: true });
  });

  it("returns 401 when no session is present", async () => {
    authMock.mockResolvedValue(null);
    const res = await ChatbotPOST(makeReq({ msg: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit fails", async () => {
    authMock.mockResolvedValue({ user: { email: "x@y.com" } });
    rateLimitMock.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: "rl" }), { status: 429 }),
    });
    const res = await ChatbotPOST(makeReq({ msg: "hi" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when msg exceeds MAX_MSG_LENGTH", async () => {
    authMock.mockResolvedValue({ user: { email: "x@y.com" } });
    const res = await ChatbotPOST(makeReq({ msg: "a".repeat(5000) }));
    expect(res.status).toBe(400);
  });

  it("returns 413 when request body exceeds MAX_BODY_SIZE", async () => {
    authMock.mockResolvedValue({ user: { email: "x@y.com" } });
    const req = new NextRequest(
      new Request("http://localhost/api/chatbot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "2000000",
        },
        body: JSON.stringify({ msg: "ok" }),
      }),
    );
    const res = await ChatbotPOST(req);
    expect([400, 413]).toContain(res.status);
  });
});
