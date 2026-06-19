import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

interface Props {
  botName: string;
  welcomeMessage: string;
  brandColor: string;
}

/**
 * Visual-only widget preview. No backend calls, no streaming.
 * Mirrors the structure of public/widget.js so what you see is what your visitors get.
 */
export function WidgetPreview({ botName, welcomeMessage, brandColor }: Props) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col items-end gap-3 select-none">
      {open && (
        <div className="w-[340px] max-h-[460px] rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-white/85 shrink-0" />
              <span className="font-semibold text-sm truncate">{botName || "Chatbot"}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-[200px] bg-background">
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
              >
                {welcomeMessage || "Hello! How can I help you today?"}
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
                style={{ backgroundColor: brandColor, color: "#fff" }}
              >
                Hi! I have a question about pricing.
              </div>
            </div>
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
              >
                Of course — happy to help! What would you like to know?
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t px-3 py-2.5 bg-background">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={120}
            />
            <button
              type="button"
              className="rounded-full p-2 transition-colors"
              style={{ backgroundColor: brandColor, color: "#fff" }}
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: brandColor, color: "#fff" }}
        aria-label={open ? "Close chat preview" : "Open chat preview"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
