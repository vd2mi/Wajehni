import Link from "next/link";
import { BookOpen, Calendar, GraduationCap, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    href: "/explain",
    icon: BookOpen,
    title: "شرح المادة",
    description: "ارفع ملف المقرر واسأل أي سؤال عن المحتوى. الذكاء الاصطناعي يشرح لك المفاهيم بوضوح.",
  },
  {
    href: "/schedule",
    icon: Calendar,
    title: "جدول الدراسة",
    description: "أدخل مهامك الدراسية والموعد النهائي، واحصل على جدول دراسي منظم يناسب وقتك.",
  },
  {
    href: "/major",
    icon: GraduationCap,
    title: "اختيار التخصص",
    description: "أجب على أسئلة عن اهتماماتك ومهاراتك، واحصل على توصيات مخصصة للتخصصات الجامعية.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <section className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          وجهني
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          مساعدك الدراسي الذكي — يشرح لك المادة، ينظم وقتك، ويساعدك تختار تخصصك.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-3">
        {FEATURES.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="leading-relaxed">{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2 group-hover:gap-3 transition-all">
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
