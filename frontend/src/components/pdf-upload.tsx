"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPdf } from "@/lib/api";

interface PdfUploadProps {
  courseId: string;
  onUploaded: () => void;
}

export function PdfUpload({ courseId, onUploaded }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return;

      setUploading(true);
      setFileName(file.name);
      try {
        await uploadPdf(courseId, file);
        onUploaded();
      } catch {
        setFileName(null);
      } finally {
        setUploading(false);
      }
    },
    [courseId, onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragOver ? "border-primary bg-primary/5" : "border-border"}
      `}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">جاري رفع {fileName}...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">تم الرفع بنجاح</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">اسحب ملف PDF هنا</p>
            <p className="text-xs text-muted-foreground mt-1">أو اضغط لاختيار ملف</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".pdf";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            اختر ملف
          </Button>
        </div>
      )}
    </div>
  );
}
