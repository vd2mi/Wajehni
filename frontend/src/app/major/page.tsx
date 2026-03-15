"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getMajorAssist } from "@/lib/api";
import ReactMarkdown from "react-markdown";

const STEPS = [
  {
    key: "interests",
    title: "الاهتمامات",
    description: "ما المواضيع أو الأنشطة التي تستمتع بها؟",
    placeholder: "مثال: البرمجة، حل المسائل الرياضية، التصميم، القراءة عن التقنية...",
  },
  {
    key: "skills",
    title: "المهارات",
    description: "ما المهارات التي تتميز بها أو تشعر أنك جيد فيها؟",
    placeholder: "مثال: التفكير التحليلي، التواصل، العمل الجماعي، الإبداع...",
  },
  {
    key: "work_preferences",
    title: "بيئة العمل المفضلة",
    description: "كيف تتخيل بيئة عملك المستقبلية؟",
    placeholder: "مثال: أفضل العمل في مكتب، أو عن بعد، أو في الميدان. أحب العمل بشكل فردي أو ضمن فريق...",
  },
  {
    key: "academic_strengths",
    title: "نقاط القوة الأكاديمية",
    description: "ما المواد الدراسية التي تبرع فيها أو تحصل فيها على درجات عالية؟",
    placeholder: "مثال: الرياضيات، الفيزياء، اللغة الإنجليزية، مهارات الحاسب...",
  },
] as const;

export default function MajorPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const canProceed = (answers[step.key] || "").trim().length > 0;

  function updateAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const result = await getMajorAssist(answers);
      setReport(result.report_markdown);
    } catch {
      setError("حدث خطأ أثناء تحليل إجاباتك. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  function handleReset() {
    setCurrentStep(0);
    setAnswers({});
    setReport(null);
    setError("");
  }

  if (report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">التخصصات الموصى بها</h1>
          <Button variant="outline" onClick={handleReset}>
            ابدأ من جديد
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="markdown-body">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">اختيار التخصص</h1>

      <div className="flex gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {currentStep + 1}
            </div>
            <CardTitle className="text-lg">{step.title}</CardTitle>
          </div>
          <CardDescription className="text-sm mr-11">
            {step.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="answer" className="sr-only">
              {step.title}
            </Label>
            <Textarea
              id="answer"
              value={answers[step.key] || ""}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder={step.placeholder}
              rows={4}
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowRight className="h-4 w-4 ml-1" />
              السابق
            </Button>

            <Button onClick={handleNext} disabled={!canProceed || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري التحليل...
                </>
              ) : isLast ? (
                <>
                  <GraduationCap className="h-4 w-4 ml-1" />
                  عرض التوصيات
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
