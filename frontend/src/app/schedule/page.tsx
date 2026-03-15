"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateSchedule, type ScheduleDay } from "@/lib/api";

export default function SchedulePage() {
  const [tasks, setTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [schedule, setSchedule] = useState<ScheduleDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addTask() {
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, trimmed]);
    setTaskInput("");
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (tasks.length === 0 || !deadline) return;
    setError("");
    setLoading(true);

    try {
      const result = await generateSchedule(tasks, deadline, hoursPerDay);
      setSchedule(result.schedule);
    } catch {
      setError("حدث خطأ أثناء إنشاء الجدول. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">جدول الدراسة</h1>
      <p className="text-sm text-muted-foreground mb-6">أدخل مهامك وسنوزعها على كل الأيام المتاحة حتى الموعد النهائي</p>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">إعداد الجدول</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>المهام الدراسية</Label>
                <div className="flex gap-2">
                  <Input
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                    placeholder="مثال: Midterm HCI 3 Chapters"
                  />
                  <Button size="icon" variant="outline" onClick={addTask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tasks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tasks.map((task, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {task}
                        <button
                          onClick={() => removeTask(i)}
                          className="hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">الموعد النهائي</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">ساعات الدراسة يومياً</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={16}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">ساعة</span>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={tasks.length === 0 || !deadline || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الجدول"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {schedule ? `الجدول — ${schedule.length} يوم` : "الجدول"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule === null ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  أضف مهامك واضغط &quot;إنشاء الجدول&quot;
                </div>
              ) : schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  لم يتم إنشاء جدول. حاول مرة أخرى.
                </p>
              ) : (
                <ScrollArea className="h-[calc(100vh-18rem)]">
                  <div className="space-y-1">
                    {schedule.map((day, i) => (
                      <div
                        key={i}
                        className="flex gap-4 py-3 border-b border-border/50 last:border-0"
                      >
                        <div className="w-32 shrink-0">
                          <p className="text-xs font-semibold text-primary leading-tight">
                            {day.day.split(" ")[0]}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono" dir="ltr">
                            {day.day.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                        <ul className="flex-1 space-y-1">
                          {day.tasks.map((task, j) => (
                            <li key={j} className="text-sm flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
