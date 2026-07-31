export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

/** URL of a file inside a course's resource folder (served by the backend). */
export function courseFileUrl(courseId: string, filePath: string): string {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  return `${API_BASE}/course-files/${encodeURIComponent(courseId)}/${encodedPath}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "حدث خطأ غير متوقع" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface Course {
  course_id: string;
  title: string;
  title_ar: string;
  major: string;
  files: string[];
}

export interface ExplainResponse {
  answer: string;
  sources: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScheduleDay {
  day: string;
  tasks: string[];
}

export interface ScheduleResponse {
  schedule: ScheduleDay[];
}

export interface MajorAssistResponse {
  report_markdown: string;
}

export interface CatalogCourse {
  course_id: string;
  code: string;
  title: string;
  title_ar: string;
  level: number;
  files: string[];
  /**
   * Optional resource folders, e.g. { Slides: ["Chapter1.pdf"], videos: [] }.
   * A `number` is the legacy count-only shape (older backends) — the UI
   * tolerates it so a frontend/backend version mismatch never crashes.
   */
  folders?: Record<string, string[] | number>;
}

export interface CatalogMajor {
  id: string;
  name_ar: string;
  name_en: string;
  courses: CatalogCourse[];
}

export interface CatalogCollege {
  id: string;
  name_ar: string;
  name_en: string;
  track_ar?: string;
  track_en?: string;
  majors: CatalogMajor[];
}

export interface CatalogUniversity {
  id: string;
  name_ar: string;
  name_en: string;
  city_ar: string;
  lat: number;
  lng: number;
  colleges: CatalogCollege[];
}

export interface CatalogRegion {
  id: string;
  name_ar: string;
  name_en: string;
  universities: CatalogUniversity[];
}

export interface Catalog {
  regions: CatalogRegion[];
}

interface CatalogNodeRef {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface CatalogMajorDetail {
  region: CatalogNodeRef;
  university: CatalogNodeRef;
  college: CatalogNodeRef;
  major: CatalogMajor;
}

export function getCatalog(): Promise<Catalog> {
  return request<Catalog>("/catalog");
}

export function getCatalogMajor(majorId: string): Promise<CatalogMajorDetail> {
  return request<CatalogMajorDetail>(`/catalog/major/${encodeURIComponent(majorId)}`);
}

export function getCourses(): Promise<Course[]> {
  return request<Course[]>("/courses");
}

export function explainQuestion(
  course_id: string,
  question: string,
  history: ChatMessage[] = [],
  language: string = "ar",
  page_number?: number,
  filename?: string,
  depth: "brief" | "detailed" = "detailed",
  mode: "explain" | "translate" = "explain"
): Promise<ExplainResponse> {
  const body: Record<string, unknown> = { course_id, question, history, language, depth, mode };
  if (page_number !== undefined) body.page_number = page_number;
  if (filename) body.filename = filename;
  return request<ExplainResponse>("/explain", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uploadPdf(course_id: string, file: File): Promise<{ status: string; chunks_indexed: number }> {
  const formData = new FormData();
  formData.append("course_id", course_id);
  formData.append("file", file);

  return fetch(`${API_BASE}/upload-pdf`, {
    method: "POST",
    body: formData,
  }).then((res) => {
    if (!res.ok) throw new Error("فشل رفع الملف");
    return res.json();
  });
}

export function generateSchedule(
  tasks: string[],
  deadline: string,
  hours_per_day: number
): Promise<ScheduleResponse> {
  return request<ScheduleResponse>("/schedule", {
    method: "POST",
    body: JSON.stringify({ tasks, deadline, hours_per_day }),
  });
}

export function getMajorAssist(answers: Record<string, string | string[]>): Promise<MajorAssistResponse> {
  return request<MajorAssistResponse>("/major-assist", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
