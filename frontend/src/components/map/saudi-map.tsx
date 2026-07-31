"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { MAP_VIEWBOX, REGION_PATHS } from "./saudi-paths";
import { regionZoom } from "./map-geo";

export const REGIONS: Record<string, { ar: string; en: string; active: boolean }> = {
  "SA-01": { ar: "الرياض",            en: "Riyadh",           active: false },
  "SA-02": { ar: "مكة المكرمة",       en: "Makkah",           active: false },
  "SA-03": { ar: "المدينة المنورة",   en: "Al Madinah",       active: false },
  "SA-04": { ar: "المنطقة الشرقية",   en: "Eastern Province", active: true  },
  "SA-05": { ar: "القصيم",            en: "Al Qassim",        active: false },
  "SA-06": { ar: "حائل",              en: "Hail",             active: false },
  "SA-07": { ar: "تبوك",              en: "Tabuk",            active: false },
  "SA-08": { ar: "الحدود الشمالية",   en: "Northern Borders", active: false },
  "SA-09": { ar: "جازان",             en: "Jazan",            active: false },
  "SA-10": { ar: "نجران",             en: "Najran",           active: false },
  "SA-11": { ar: "الباحة",            en: "Al Bahah",         active: false },
  "SA-12": { ar: "الجوف",             en: "Al Jouf",          active: false },
  "SA-14": { ar: "عسير",              en: "Asir",             active: false },
};

interface HoverState {
  regionId: string;
  x: number;
  y: number;
}

interface SaudiMapProps {
  /** Region id to zoom into (URL-driven). Null/undefined shows the full map. */
  zoomRegion?: string | null;
  onRegionSelect?: (regionId: string) => void;
  className?: string;
  /** Extra SVG layers rendered in map user-unit coordinates (e.g. university pins). */
  children?: React.ReactNode;
}

export function SaudiMap({ zoomRegion, onRegionSelect, className, children }: SaudiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const reduceMotion = useReducedMotion();

  // Framer Motion scales SVG elements about their bounding box (originX/Y as
  // fractions of it), so convert the canvas-origin transform accordingly.
  const [bboxOrigin, setBboxOrigin] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const b = groupRef.current?.getBBox();
    if (b) setBboxOrigin({ x: b.x, y: b.y });
  }, []);

  const zoom = zoomRegion ? regionZoom(zoomRegion) : null;
  const target = zoom
    ? {
        x: zoom.tx + (zoom.scale - 1) * bboxOrigin.x,
        y: zoom.ty + (zoom.scale - 1) * bboxOrigin.y,
        scale: zoom.scale,
      }
    : { x: 0, y: 0, scale: 1 };

  const interactive = !zoom;

  function trackCursor(regionId: string, e: React.MouseEvent) {
    if (!interactive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ regionId, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function selectRegion(regionId: string) {
    if (interactive && REGIONS[regionId]?.active) onRegionSelect?.(regionId);
  }

  const hoverRegion = hover && interactive ? REGIONS[hover.regionId] : null;

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      <svg
        viewBox={MAP_VIEWBOX}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={t.map.mapLabel}
        className="h-full w-full"
      >
        <motion.g
          ref={groupRef}
          initial={false}
          animate={target}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }}
          style={{ originX: 0, originY: 0 }}
        >
          {Object.entries(REGION_PATHS).map(([id, d]) => {
            const region = REGIONS[id];
            const active = region?.active ?? false;
            return (
              <path
                key={id}
                id={id}
                d={d}
                role={active && interactive ? "button" : undefined}
                tabIndex={active && interactive ? 0 : undefined}
                aria-label={region?.ar}
                aria-disabled={!active}
                onClick={() => selectRegion(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectRegion(id);
                  }
                }}
                onMouseMove={(e) => trackCursor(id, e)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "stroke-background transition-[fill-opacity,opacity] duration-200 focus:outline-none",
                  active
                    ? cn(
                        "fill-primary/25",
                        interactive &&
                          "cursor-pointer hover:fill-primary/40 focus-visible:fill-primary/40"
                      )
                    : "cursor-default fill-muted opacity-50"
                )}
                strokeWidth={1}
              />
            );
          })}

          {/* Accent outline on the active region — draws the eye with a subtle pulse. */}
          {interactive && (
            <path
              d={REGION_PATHS["SA-04"]}
              className="pointer-events-none fill-none stroke-primary motion-safe:animate-pulse"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          )}

          {children}
        </motion.g>
      </svg>

      {/* Floating label following the cursor */}
      {hover && hoverRegion && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md">
            <span>{hoverRegion.ar}</span>
            {!hoverRegion.active && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {t.map.comingSoon}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
