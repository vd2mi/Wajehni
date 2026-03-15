"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PdfUpload } from "@/components/pdf-upload";
import { ChatSidebar } from "@/components/chat-sidebar";
import { getCourses, type Course } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExplainPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [customCourseId, setCustomCourseId] = useState("");
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  const activeCourseId = selectedCourse === "__custom"
    ? customCourseId
    : selectedCourse;

  const handleUploaded = useCallback(() => {
    setUploadKey((k) => k + 1);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">شرح المادة</h1>

      <div className="grid lg:grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">اختر المقرر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <div className="space-y-1.5">
                  <Label htmlFor="custom-id">رمز المقرر</Label>
                  <Input
                    id="custom-id"
                    placeholder="مثال: CS301"
                    value={customCourseId}
                    onChange={(e) => setCustomCourseId(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {activeCourseId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">رفع ملف PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <PdfUpload
                  key={`upload-${activeCourseId}`}
                  courseId={activeCourseId}
                  onUploaded={handleUploaded}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">المحادثة</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 p-0 overflow-hidden">
            {activeCourseId ? (
              <ChatSidebar key={`chat-${activeCourseId}-${uploadKey}`} courseId={activeCourseId} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">اختر مقرراً أولاً للبدء</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
