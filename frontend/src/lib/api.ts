const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

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

export function getCourses(): Promise<Course[]> {
  return request<Course[]>("/courses");
}

export function explainQuestion(
  course_id: string,
  question: string,
  history: ChatMessage[] = []
): Promise<ExplainResponse> {
  return request<ExplainResponse>("/explain", {
    method: "POST",
    body: JSON.stringify({ course_id, question, history }),
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
