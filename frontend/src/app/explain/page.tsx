"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Upload, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(
  () => import("@/components/pdf-viewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    ),
  }
);

import type { ExplainAction } from "@/components/pdf-viewer";
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
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Language = "ar" | "en" | "both";

function preprocessMath(text: string): string {
  return text
    .replace(/\\\((.+?)\\\)/g, (_, m) => `$${m}$`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\(\s*(\\[a-zA-Z][\s\S]*?)\s*\)/g, (_, m) => `$${m}$`)
    .replace(/\[\s*(\\[a-zA-Z][\s\S]*?)\s*\]/g, (_, m) => `$$${m}$$`);
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sourceCount?: number;
}

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
  { value: "both", label: "Both" },
];

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
  const [quizzing, setQuizzing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [chatMessages, setChatMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const contentScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const activeCourseId =
    selectedCourse === "__custom" ? customCourseId : selectedCourse;

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (chatMessages.length > 0 && contentScrollRef.current) {
      contentScrollRef.current.scrollTop =
        contentScrollRef.current.scrollHeight;
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
      setCurrentPage(1);

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

  async function handleExplainPage(pageNum: number, action: ExplainAction) {
    if (!activeCourseId || !fileName) return;
    setExplaining(true);
    setExplanation("");
    setChatMessages([]);
    setChatHistory([]);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }

    const mode = action.kind === "translate" ? "translate" as const : "explain" as const;
    const depth = action.kind === "explain" ? action.depth : "detailed" as const;

    let prompt: string;
    if (action.kind === "translate") {
      prompt =
        language === "ar"
          ? `ترجم محتوى الصفحة ${pageNum}`
          : `Translate the content of page ${pageNum}`;
    } else if (depth === "brief") {
      prompt =
        language === "ar"
          ? `اشرح محتوى الصفحة ${pageNum} بشكل مختصر`
          : language === "en"
            ? `Give a brief overview of page ${pageNum}`
            : `Give a brief overview of page ${pageNum}, with Arabic translation`;
    } else {
      prompt =
        language === "ar"
          ? `اشرح محتوى الصفحة ${pageNum} بالتفصيل`
          : language === "en"
            ? `Explain the content of page ${pageNum} in detail`
            : `Explain the content of page ${pageNum} in detail, with Arabic translation`;
    }

    try {
      const response = await explainQuestion(
        activeCourseId,
        prompt,
        [],
        language,
        pageNum,
        fileName,
        depth,
        mode,
      );
      setExplanation(response.answer);
      setChatHistory([
        { role: "user", content: prompt },
        { role: "assistant", content: response.answer },
      ]);
    } catch {
      setExplanation(
        language === "ar"
          ? "حدث خطأ أثناء الشرح."
          : "An error occurred while explaining."
      );
    } finally {
      setExplaining(false);
    }
  }

  async function handleQuizPage(pageNum: number) {
    if (!activeCourseId || !fileName) return;
    setQuizzing(true);
    setExplanation("");
    setChatMessages([]);
    setChatHistory([]);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
    try {
      const prompt =
        language === "ar"
          ? `أنشئ 5 أسئلة تدريبية من محتوى الصفحة ${pageNum} لاختبار فهم الطالب. اكتب السؤال ثم اترك سطر فارغ قبل الإجابة. ضع الإجابة تحت كل سؤال بعنوان "الإجابة:".`
          : language === "en"
            ? `Generate 5 practice questions from the content of page ${pageNum} to test the student's understanding. Write each question, leave a blank line, then provide the answer under "Answer:".`
            : `Generate 5 practice questions from the content of page ${pageNum} to test the student's understanding. Write each question in English first, then in Arabic. Provide answers in both languages under each question.`;
      const response = await explainQuestion(
        activeCourseId,
        prompt,
        [],
        language,
        pageNum,
        fileName
      );
      setExplanation(response.answer);
      setChatHistory([
        { role: "user", content: prompt },
        { role: "assistant", content: response.answer },
      ]);
    } catch {
      setExplanation(
        language === "ar"
          ? "حدث خطأ أثناء إنشاء الأسئلة."
          : "An error occurred while generating questions."
      );
    } finally {
      setQuizzing(false);
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

  const textDir = language === "en" ? "ltr" : "rtl";

  // ───── Setup view ─────
  if (!uploaded || !pdfUrl) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold mb-1">شرح المادة</h1>
        <p className="text-sm text-muted-foreground mb-10">
          اختر المقرر، حدد اللغة، ثم ارفع ملف PDF.
        </p>

        <div className="space-y-8">
          {/* Course */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              المقرر
            </Label>
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

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              لغة الشرح
            </Label>
            <div className="flex gap-0 border rounded-md overflow-hidden">
              {LANG_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLanguage(value)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    language === value
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          {activeCourseId && (
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ملف PDF
              </Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                className="border-2 border-dashed rounded-lg p-12 text-center transition-colors hover:border-foreground/20 cursor-pointer"
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
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      جاري الرفع والتحليل...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                    <p className="text-sm">اسحب ملف PDF هنا أو اضغط للاختيار</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───── Main view ─────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b px-4 py-2 flex items-center justify-between gap-4 bg-background shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate max-w-[180px]">{fileName}</span>
        </div>

        <div className="flex items-center gap-0.5 border rounded-md overflow-hidden shrink-0">
          {LANG_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLanguage(value)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                language === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex min-h-0">
        {/* Left: PDF */}
        <div className="w-1/2 border-l flex flex-col min-h-0">
          <PdfViewer
            fileUrl={pdfUrl}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onExplainPage={(page, action) => handleExplainPage(page, action)}
            onQuizPage={handleQuizPage}
            explaining={explaining}
            quizzing={quizzing}
          />
        </div>

        {/* Right: Content */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto" ref={contentScrollRef}>
            <div className="p-5" dir={textDir}>
              {/* Loading */}
              {explaining && !explanation && (
                <div className="flex items-center gap-3 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">
                    {language === "ar"
                      ? "جاري الشرح..."
                      : "Generating explanation..."}
                  </span>
                </div>
              )}

              {/* Explanation */}
              {explanation && (
                <div className="markdown-body text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{preprocessMath(explanation)}</ReactMarkdown>
                </div>
              )}

              {/* Empty state */}
              {!explanation && !explaining && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {language === "en"
                      ? 'Use the "اشرح" menu to explain or translate, or type a question below.'
                      : 'استخدم قائمة "اشرح" للشرح أو الترجمة، أو اكتب سؤالك أدناه.'}
                  </p>
                </div>
              )}

              {/* Chat thread */}
              {chatMessages.length > 0 && (
                <div className="mt-5 pt-5 border-t space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-foreground text-background"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{preprocessMath(msg.content)}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.sourceCount !== undefined &&
                          msg.sourceCount > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>
                                {language === "en"
                                  ? `Based on ${msg.sourceCount} sections`
                                  : `مبني على ${msg.sourceCount} مقاطع من المادة`}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3.5 py-2.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat input */}
          <div className="border-t p-3 shrink-0" dir={textDir}>
            <div className="flex gap-2">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder={
                  language === "en"
                    ? "Ask about this page..."
                    : "اكتب سؤالك عن الصفحة..."
                }
                className="min-h-[42px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                className="shrink-0"
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
