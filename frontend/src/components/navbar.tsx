"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/explain", label: "شرح المادة", icon: BookOpen },
  { href: "/schedule", label: "الجدول", icon: Calendar },
  { href: "/major", label: "التخصص", icon: GraduationCap },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl h-full flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">و</span>
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:inline">
            وجهني
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <div className="mr-2" />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
