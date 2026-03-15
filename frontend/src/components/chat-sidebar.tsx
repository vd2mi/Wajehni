"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { explainQuestion, type ChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sourceCount?: number;
}

interface ChatSidebarProps {
  courseId: string;
}

export function ChatSidebar({ courseId }: ChatSidebarProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const response = await explainQuestion(courseId, question, history);

      const newHistory: ChatMessage[] = [
        ...history,
        { role: "user", content: question },
        { role: "assistant", content: response.answer },
      ];
      setHistory(newHistory);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          sourceCount: response.sources.length,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "حدث خطأ أثناء معالجة سؤالك. حاول مرة أخرى." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-muted-foreground text-center">
              اسأل أي سؤال عن محتوى المادة
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                dir="rtl"
              >
                {msg.role === "assistant" ? (
                  <div className="markdown-body" dir="rtl">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {msg.sourceCount !== undefined && msg.sourceCount > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>مبني على {msg.sourceCount} مقاطع من المادة</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            dir="rtl"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
