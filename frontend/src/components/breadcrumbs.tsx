import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label={t.breadcrumb.label}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-x-2">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            )}
            {!last && <span className="text-muted-foreground/50">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
