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
    <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl h-full flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">و</span>
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:inline">وجهني</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <div className="mr-1.5" />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
