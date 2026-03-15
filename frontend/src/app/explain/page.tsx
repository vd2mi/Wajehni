"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Upload,
  FileText,
  Loader2,
  Send,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  ),
});
import {
  getCourses,
  explainQuestion,
  uploadPdf,
  type Course,
  type ChatMessage,
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";

type Language = "ar" | "en";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sourceCount?: number;
}

export default function ExplainPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [customCourseId, setCustomCourseId] = useState("");
  const [language, setLanguage] = useState<Language>("ar");

  const [pdfUrl, setPdfUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  const [chatMessages, setChatMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const activeCourseId =
    selectedCourse === "__custom" ? customCourseId : selectedCourse;

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!activeCourseId || !file.name.toLowerCase().endsWith(".pdf")) return;
      setPdfUrl(URL.createObjectURL(file));
      setFileName(file.name);
      setUploading(true);
      setExplanation("");
      setChatMessages([]);
      setChatHistory([]);

      try {
        await uploadPdf(activeCourseId, file);
        setUploaded(true);
      } catch {
        setPdfUrl("");
        setFileName("");
      } finally {
        setUploading(false);
      }
    },
    [activeCourseId]
  );

  async function handleExplainPage(pageNum: number) {
    if (!activeCourseId || !fileName) return;
    setExplaining(true);
    setExplanation("");
    try {
      const prompt =
        language === "ar"
          ? "اشرح محتوى هذه الصفحة بالتفصيل"
          : "Explain the content of this page in detail";
      const response = await explainQuestion(
        activeCourseId,
        prompt,
        [],
        language,
        pageNum,
        fileName
      );
      setExplanation(response.answer);
    } catch {
      setExplanation(
        language === "ar" ? "حدث خطأ أثناء الشرح." : "An error occurred."
      );
    } finally {
      setExplaining(false);
    }
  }

  async function handleChatSend() {
    const q = chatInput.trim();
    if (!q || chatLoading || !activeCourseId) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const response = await explainQuestion(
        activeCourseId,
        q,
        chatHistory,
        language
      );
      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: response.answer },
      ]);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          sourceCount: response.sources.length,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "ar"
              ? "حدث خطأ. حاول مرة أخرى."
              : "An error occurred. Try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  }

  // ----- Setup view (before PDF is uploaded) -----
  if (!uploaded || !pdfUrl) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold mb-2">شرح المادة</h1>
        <p className="text-muted-foreground mb-8">
          اختر المقرر، حدد اللغة، ثم ارفع ملف PDF لبدء الشرح.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>المقرر</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مقرر..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.course_id} value={c.course_id}>
                    {c.title_ar || c.title} ({c.course_id})
                  </SelectItem>
                ))}
                <SelectItem value="__custom">مقرر مخصص...</SelectItem>
              </SelectContent>
            </Select>
            {selectedCourse === "__custom" && (
              <Input
                placeholder="مثال: CS301"
                value={customCourseId}
                onChange={(e) => setCustomCourseId(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>لغة الشرح</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("ar")}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  language === "ar"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent"
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  language === "en"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {activeCourseId && (
            <div className="space-y-2">
              <Label>ملف PDF</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                className="border-2 border-dashed rounded-lg p-10 text-center transition-colors hover:border-foreground/30 cursor-pointer"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".pdf";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      جاري الرفع والتحليل...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        اسحب ملف PDF هنا أو اضغط للاختيار
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- Main view (PDF + Explanation) -----
  const isRtl = language === "ar";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setLanguage("ar")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              language === "ar"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            عربي
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              language === "en"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex min-h-0">
        {/* Left: PDF viewer */}
        <div className="w-1/2 border-l flex flex-col min-h-0">
          <PdfViewer
            fileUrl={pdfUrl}
            onExplainPage={handleExplainPage}
            explaining={explaining}
          />
        </div>

        {/* Right: Explanation + Chat */}
        <div className="w-1/2 flex flex-col min-h-0">
          {/* Explanation area */}
          <div className="flex-1 overflow-auto" ref={chatScrollRef}>
            <div className="p-5" dir={isRtl ? "rtl" : "ltr"}>
              {explaining && !explanation && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">
                    {isRtl ? "جاري الشرح..." : "Generating explanation..."}
                  </span>
                </div>
              )}

              {explanation && (
                <div className="markdown-body text-sm leading-relaxed">
                  <ReactMarkdown>{explanation}</ReactMarkdown>
                </div>
              )}

              {!explanation && !explaining && (
                <p className="text-sm text-muted-foreground">
                  {isRtl
                    ? 'اضغط "اشرح الصفحة" لعرض شرح تفصيلي، أو اكتب سؤالك أدناه.'
                    : 'Click "اشرح الصفحة" to get a detailed explanation, or type your question below.'}
                </p>
              )}

              {/* Chat messages */}
              {chatMessages.length > 0 && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-foreground text-background"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.sourceCount !== undefined &&
                          msg.sourceCount > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>
                                {isRtl
                                  ? `مبني على ${msg.sourceCount} مقاطع من المادة`
                                  : `Based on ${msg.sourceCount} sections`}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat input */}
          <div className="border-t p-3 shrink-0" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder={
                  isRtl ? "اكتب سؤالك هنا..." : "Type your question..."
                }
                className="min-h-[44px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
