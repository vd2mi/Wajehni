"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Download, FileText, FolderOpen, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";
import {
  courseFileUrl,
  getCatalogMajor,
  uploadPdf,
  type CatalogCourse,
  type CatalogMajorDetail,
} from "@/lib/api";
import { t } from "@/lib/i18n";

type Tab = "courses" | "board";

export default function MajorSpacePage() {
  const params = useParams<{ universityId: string; collegeId: string; majorId: string }>();
  const [detail, setDetail] = useState<CatalogMajorDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [tab, setTab] = useState<Tab>("courses");

  useEffect(() => {
    getCatalogMajor(params.majorId)
      .then((d) => {
        setDetail(d);
        setStatus("ready");
      })
      .catch((err: Error) => {
        setStatus(err.message.includes("not found") ? "missing" : "error");
      });
  }, [params.majorId]);

  const crumbs: Crumb[] = [
    { label: t.breadcrumb.home, href: "/" },
    ...(detail
      ? [
          { label: detail.region.name_ar, href: `/?region=${detail.region.id}` },
          { label: detail.university.name_ar, href: `/university/${detail.university.id}` },
          { label: detail.major.name_ar },
        ]
      : []),
  ];

  // Group courses by level, ascending
  const levels: { level: number; courses: CatalogCourse[] }[] = [];
  if (detail) {
    for (const course of detail.major.courses) {
      const existing = levels.find((l) => l.level === course.level);
      if (existing) existing.courses.push(course);
      else levels.push({ level: course.level, courses: [course] });
    }
    levels.sort((a, b) => a.level - b.level);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "courses", label: t.majorSpace.tabCourses },
    { id: "board", label: t.majorSpace.tabBoard },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={crumbs} />
      </div>

      {status === "loading" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.loading}</p>
      )}
      {status === "error" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.loadError}</p>
      )}
      {status === "missing" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.notFound}</p>
      )}

      {status === "ready" && detail && (
        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <header className="py-8 sm:py-10">
            <p className="text-sm text-muted-foreground">{t.majorSpace.title}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {detail.major.name_ar}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {detail.major.name_en} — {detail.college.name_ar}
            </p>
          </header>

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {tab === "courses" ? (
              levels.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t.majorSpace.noCourses}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {levels.map(({ level, courses }) => (
                    <section key={level}>
                      <h2 className="mb-3 text-base font-semibold">
                        {t.majorSpace.levelName(level)}
                      </h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {courses.map((course) => (
                          <CourseCard key={course.course_id} course={course} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-muted-foreground">{t.majorSpace.boardComingSoon}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FolderMenu({
  course,
  name,
  files,
}: {
  course: CatalogCourse;
  name: string;
  files: string[];
}) {
  const router = useRouter();

  function openFile(file: string) {
    const path = `${name}/${file}`;
    if (file.toLowerCase().endsWith(".pdf")) {
      // PDFs open directly in the learning page
      router.push(
        `/explain?course=${encodeURIComponent(course.course_id)}&file=${encodeURIComponent(path)}`
      );
    } else {
      // Other formats can only be downloaded
      window.open(courseFileUrl(course.course_id, path), "_blank");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent">
          <FolderOpen className="h-3 w-3" />
          <span dir="ltr">
            {name}
            {files.length > 0 ? ` (${files.length})` : ""}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {files.length === 0 ? (
          <DropdownMenuItem disabled>{t.majorSpace.emptyFolder}</DropdownMenuItem>
        ) : (
          files.map((file) => {
            const isPdf = file.toLowerCase().endsWith(".pdf");
            return (
              <DropdownMenuItem key={file} onClick={() => openFile(file)} className="gap-2">
                {isPdf ? (
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span dir="ltr">{file}</span>
                {!isPdf && (
                  <span className="mr-auto text-xs text-muted-foreground">
                    {t.majorSpace.downloadHint}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CourseCard({ course }: { course: CatalogCourse }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileCount, setFileCount] = useState(course.files.length);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "failed">("idle");

  async function handleUpload(file: File) {
    setUploadState("uploading");
    try {
      await uploadPdf(course.course_id, file);
      setFileCount((n) => n + 1);
      setUploadState("done");
    } catch {
      setUploadState("failed");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base leading-snug">{course.title_ar}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{course.title}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-xs" dir="ltr">
            {course.code}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          {t.majorSpace.filesCount(fileCount)}
        </p>

        {course.folders && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(course.folders).map(([name, files]) => (
              <FolderMenu key={name} course={course} name={name} files={files} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => router.push(`/explain?course=${encodeURIComponent(course.course_id)}`)}
          >
            <BookOpen className="ml-1.5 h-4 w-4" />
            {t.majorSpace.openInExplain}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={uploadState === "uploading"}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="ml-1.5 h-4 w-4" />
            {uploadState === "uploading" ? t.majorSpace.uploading : t.majorSpace.uploadFile}
          </Button>
          {uploadState === "done" && (
            <span className="text-xs text-muted-foreground">{t.majorSpace.uploadDone}</span>
          )}
          {uploadState === "failed" && (
            <span className="text-xs text-destructive">{t.majorSpace.uploadFailed}</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
