"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronRight, ChevronLeft, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  onExplainPage: (pageNumber: number) => void;
  explaining: boolean;
}

export function PdfViewer({ fileUrl, onExplainPage, explaining }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setCurrentPage(1);
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

      <div className="border-t bg-background px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums min-w-[4rem] text-center">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={() => onExplainPage(currentPage)}
          disabled={explaining}
          size="sm"
          className="gap-2"
        >
          {explaining ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="h-4 w-4" />
          )}
          اشرح الصفحة
        </Button>
      </div>
    </div>
  );
}
