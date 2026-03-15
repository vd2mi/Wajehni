import Link from "next/link";
import { BookOpen, Calendar, GraduationCap, ArrowLeft } from "lucide-react";

const FEATURES = [
  {
    href: "/explain",
    icon: BookOpen,
    title: "شرح المادة",
    description: "ارفع ملف PDF واحصل على شرح واضح لكل صفحة مع ترجمة المصطلحات.",
    cta: "ابدأ الشرح",
  },
  {
    href: "/schedule",
    icon: Calendar,
    title: "جدول الدراسة",
    description: "أدخل مهامك والموعد النهائي، واحصل على جدول يومي منظم.",
    cta: "نظّم وقتك",
  },
  {
    href: "/major",
    icon: GraduationCap,
    title: "اختيار التخصص",
    description: "أجب على أسئلة بسيطة واحصل على توصيات مخصصة لتخصصك.",
    cta: "اكتشف تخصصك",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
            وجّهني
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
            أداتك الدراسية — تشرح لك المادة، تنظم وقتك، وتساعدك تختار تخصصك.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-0 border-t">
            {FEATURES.map(({ href, icon: Icon, title, description, cta }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-5 py-7 border-b transition-colors hover:bg-accent/40 -mx-4 px-4 sm:-mx-6 sm:px-6"
              >
                <div className="mt-1 shrink-0 h-10 w-10 rounded-md bg-muted flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold mb-1">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="shrink-0 mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  <span className="hidden sm:inline">{cta}</span>
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto px-4 py-6 border-t">
        <p className="text-center text-xs text-muted-foreground">
          وجهني — مشروع تعليمي مفتوح
        </p>
      </div>
    </div>
  );
}
