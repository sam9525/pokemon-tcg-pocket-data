"use client";
import ChatbotIcon from "../icons/chatbot";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatbotMessage {
  id: string;
  isUser: boolean;
  message: string;
}

interface ChatbotResponse {
  aiMessage?: string;
  error?: string;
  details?: string;
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
      ref.current.scrollTop = ref.current.scrollHeight;
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
    <div className="flex justify-start animate-slideInLeft">
      <div className={AI_CLASS}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
      </div>
    </div>
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

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    const result = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg: message }),
    });

    if (!result.ok) {
      throw new Error(`HTTP error! status: ${result.status}`);
    }

    const response: ChatbotResponse = await result.json();

    if (response.error) {
      throw new Error(response.error);
    }

    return response.aiMessage || "";
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
        const aiResponse = await sendMessage(msg);
        addMessage({ isUser: false, message: aiResponse });
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
