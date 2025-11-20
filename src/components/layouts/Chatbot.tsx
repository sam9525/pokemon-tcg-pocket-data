"use client";
import Link from "next/link";
import ChatbotIcon from "../icons/chatbot";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatbotMessage {
  id: string;
  isUser: boolean;
  message: string;
  links?: Array<{ title: string; uri: string }>;
}

const USER_CLASS = "max-w-110 m-4 p-2 bg-primary text-background rounded-md";
const AI_CLASS =
  "max-w-110 m-4 p-2 bg-background text-primary rounded-md border-2 border-primary";
const SCROLL_BAR_CLASS =
  "w-full h-15 max-h-40 bg-background p-4 focus:outline-none break-words leading-relaxed resize-none overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/40";

function useChatScroll<T>(dep: T): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [dep]);
  return ref;
}

const MessageItem = React.memo(({ msg }: { msg: ChatbotMessage }) =>
  msg.isUser ? (
    <div className="flex justify-end animate-slideInRight">
      <div className={USER_CLASS}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
      </div>
    </div>
  ) : (
    <>
      <div className="flex justify-start animate-slideInLeft">
        <div className={AI_CLASS}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.message}
          </ReactMarkdown>
        </div>
      </div>
      <div className="flex flex-wrap max-w-150">
        {msg.links?.map((link, idx) => (
          <div
            key={`${msg.id}-link-${idx}`}
            className="m-1.5 p-2 bg-primary rounded-2xl break-words"
          >
            <Link href={link.uri} className="text-background">
              {link.title || link.uri}
            </Link>
          </div>
        ))}
      </div>
    </>
  )
);
MessageItem.displayName = "MessageItem";

const LoadingIndicator = () => (
  <div className="flex justify-start animate-slideInLeft">
    <div className={`${AI_CLASS} flex items-center gap-1`}>
      <span>Typing</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        >
          .
        </span>
      ))}
    </div>
  </div>
);

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  const chatbotRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = useChatScroll(messages);

  const closeChatbot = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      closeChatbot();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, closeChatbot]);

  const handleClickOutsideChatbot = useCallback(
    (event: MouseEvent) => {
      if (!isOpen || !chatbotRef.current || !buttonRef.current) return;

      const target = event.target as Node;
      if (
        !chatbotRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        closeChatbot();
      }
    },
    [isOpen, closeChatbot]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutsideChatbot);
      return () =>
        document.removeEventListener("mousedown", handleClickOutsideChatbot);
    }
  }, [isOpen, handleClickOutsideChatbot]);

  // Scroll to bottom when chatbot opens
  useEffect(() => {
    if (isOpen && ref.current) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        if (ref.current) {
          ref.current.scrollTo({
            top: ref.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msg: message }),
    });

    // Check if it's an error response (JSON)
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Unknown error");
    }

    // Read SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = ""; // Buffer for incomplete chunks
    let fullResponse = "";
    const currentMessageId = crypto.randomUUID();

    // Add initial empty AI message
    setMessages((prev) => [
      ...prev,
      { isUser: false, message: "", id: currentMessageId },
    ]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines
        const lines = buffer.split("\n");

        // Keep last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith("data: ")) {
            const data = line.substring(6);

            if (data === "[DONE]") {
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.text) {
                fullResponse += parsed.text;

                // Update the AI message progressively
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageId
                      ? { ...msg, message: fullResponse }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", parseError);
            }
          } else if (line.startsWith("links: ")) {
            const data = line.substring(6);

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              // Batch all links into single update for better performance
              const newLinks = parsed.links.map((link: { web: { title: string; uri: string } }) => ({
                title: link.web.title,
                uri: link.web.uri,
              }));

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === currentMessageId
                    ? {
                        ...msg,
                        links: [...(msg.links || []), ...newLinks],
                      }
                    : msg
                )
              );
            } catch (parseError) {
              console.warn("Failed to parse links:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }, []);

  const handleTextareaResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "3.75rem";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "3.75rem";
    }
  }, []);

  const addMessage = useCallback((message: Omit<ChatbotMessage, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID() }]);
  }, []);

  const handleAskRequest = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;

      e.preventDefault();
      const msg = inputMessage.trim();

      if (!msg) return;

      setInputMessage("");
      resetTextareaHeight();

      addMessage({ isUser: true, message: msg });
      setIsLoading(true);

      try {
        await sendMessage(msg);
      } catch (error) {
        console.error("Chat error:", error);
        addMessage({
          isUser: false,
          message:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Sorry, there was an error processing your request.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [inputMessage, sendMessage, resetTextareaHeight, addMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputMessage(e.target.value);
      handleTextareaResize();
    },
    [handleTextareaResize]
  );

  return (
    <>
      <div
        ref={buttonRef}
        className="w-15 h-15 rounded-full fixed bottom-10 right-10 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
        onClick={handleToggle}
      >
        <ChatbotIcon />
      </div>
      {isOpen && (
        <div
          ref={chatbotRef}
          className={`w-150 h-180 bg-foreground border-4 border-primary rounded-md fixed bottom-30 right-10 z-200 flex flex-col ${
            isClosing ? "chatbot-close" : "chatbot-open"
          }`}
        >
          <div className="w-full h-15 bg-primary flex items-center justify-center text-2xl font-bold text-background">
            Pokebot
          </div>
          <div ref={ref} className="flex-1 overflow-y-auto overflow-x-hidden">
            {messages.map((msg) => (
              <MessageItem key={msg.id} msg={msg} />
            ))}
            {isLoading && <LoadingIndicator />}
          </div>
          <textarea
            id="ask"
            ref={textareaRef}
            value={inputMessage}
            placeholder="Ask pokebot"
            className={SCROLL_BAR_CLASS}
            onKeyDown={handleAskRequest}
            onChange={handleInputChange}
          />
        </div>
      )}
    </>
  );
}
