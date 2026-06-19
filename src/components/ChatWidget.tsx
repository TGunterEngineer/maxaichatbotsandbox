import { memo, useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
}

interface ChatWidgetProps {
  organizationId: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Memoized bubble — only re-renders when its own props change.
// Stable messages don't re-render as new tokens stream into the active bubble.
const MessageBubble = memo(function MessageBubble({
  role,
  content,
  brandColor,
}: {
  role: "bot" | "user";
  content: string;
  brandColor: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { backgroundColor: brandColor, color: "#fff" }
            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }
        }
      >
        {content}
      </div>
    </div>
  );
});

export function ChatWidget({ organizationId }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [botName, setBotName] = useState("MaximumAI Chatbot");
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // rAF batching: tokens arrive faster than the screen refreshes — coalesce them.
  const pendingContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const flushStreaming = useCallback(() => {
    rafIdRef.current = null;
    setStreamingContent(pendingContentRef.current);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(flushStreaming);
  }, [flushStreaming]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      const [botRes, orgRes] = await Promise.all([
        supabase
          .from("bot_configs")
          .select("bot_name, welcome_message, support_email")
          .eq("organization_id", organizationId)
          .single(),
        supabase
          .from("organizations")
          .select("primary_color")
          .eq("id", organizationId)
          .single(),
      ]);

      const welcome = botRes.data?.welcome_message ?? "Hello! How can I help you?";
      const name = botRes.data?.bot_name ?? "MaximumAI Chatbot";
      const color = orgRes.data?.primary_color ?? "#3B82F6";

      setBotName(name);
      setBrandColor(color);
      setSupportEmail(botRes.data?.support_email ?? null);
      setMessages([{ id: "welcome", role: "bot", content: welcome }]);
      setLoading(false);
    };

    fetchConfig();
  }, [organizationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    pendingContentRef.current = "";
    setStreamingContent("");

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          session_id: sessionId,
          message: text,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Failed to connect" }));
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "bot", content: err.error || "Something went wrong. Please try again." },
        ]);
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              pendingContentRef.current = assistantContent;
              scheduleFlush();
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Cancel any pending rAF — we're committing to the messages list now.
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (assistantContent) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "bot", content: assistantContent },
        ]);
      }
      setStreamingContent("");
      pendingContentRef.current = "";
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "bot", content: "Sorry, something went wrong. Please try again." },
      ]);
      setStreamingContent("");
      pendingContentRef.current = "";
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, organizationId, sessionId, scheduleFlush]);

  if (loading) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[380px] max-h-[520px] rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 text-white"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold text-sm">{botName}</span>
            </div>
            <div className="flex items-center gap-2">
              {supportEmail && (
                <a
                  href={`mailto:${encodeURIComponent(supportEmail)}?subject=Support%20Request`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20 transition-colors"
                  title="Email support"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Support
                </a>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[280px]">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                brandColor={brandColor}
              />
            ))}
            {streaming && streamingContent && (
              <MessageBubble role="bot" content={streamingContent} brandColor={brandColor} />
            )}
            {streaming && !streamingContent && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm"
                  style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t px-4 py-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={500}
              disabled={streaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="rounded-full p-2 transition-colors disabled:opacity-40"
              style={{ backgroundColor: brandColor, color: "#fff" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: brandColor, color: "#fff" }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
