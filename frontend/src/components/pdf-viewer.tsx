"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Lightbulb,
  HelpCircle,
  Loader2,
  Languages,
  Zap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type ExplainAction =
  | { kind: "explain"; depth: "brief" | "detailed" }
  | { kind: "translate" };

interface PdfViewerProps {
  fileUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onExplainPage: (pageNumber: number, action: ExplainAction) => void;
  onQuizPage: (pageNumber: number) => void;
  explaining: boolean;
  quizzing: boolean;
}

export function PdfViewer({
  fileUrl,
  currentPage,
  onPageChange,
  onExplainPage,
  onQuizPage,
  explaining,
  quizzing,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  const busy = explaining || quizzing;

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 32);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [updateWidth]);

  function onLoadSuccess({ numPages: total }: { numPages: number }) {
    setNumPages(total);
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={Math.min(containerWidth, 700)}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      <div className="border-t bg-background px-3 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground min-w-[3.5rem] text-center">
              {currentPage} / {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onQuizPage(currentPage)}
              disabled={busy}
            >
              {quizzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HelpCircle className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">اختبرني</span>
            </Button>

            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild disabled={busy}>
                <Button size="sm" className="h-8 gap-1 text-xs">
                  {explaining ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">اشرح</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem
                  onClick={() =>
                    onExplainPage(currentPage, { kind: "explain", depth: "brief" })
                  }
                >
                  <Zap className="h-4 w-4" />
                  شرح مختصر
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onExplainPage(currentPage, { kind: "explain", depth: "detailed" })
                  }
                >
                  <BookOpen className="h-4 w-4" />
                  شرح تفصيلي
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    onExplainPage(currentPage, { kind: "translate" })
                  }
                >
                  <Languages className="h-4 w-4" />
                  ترجم الصفحة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
