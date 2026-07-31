"use client";

import { motion, useReducedMotion } from "framer-motion";
import { geoToMap } from "./map-geo";

export interface UniversityPin {
  id: string;
  name_ar: string;
  lat: number;
  lng: number;
}

interface UniversityPinsProps {
  universities: UniversityPin[];
  onSelect: (universityId: string) => void;
}

/**
 * Pin markers rendered inside the zoomed map <g>, in SVG user units.
 * Sizes are chosen for the zoomed-in state (they inherit the zoom scale).
 */
export function UniversityPins({ universities, onSelect }: UniversityPinsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {universities.map((u) => {
        const { x, y } = geoToMap(u.lat, u.lng);
        return (
          <motion.g
            key={u.id}
            transform={`translate(${x}, ${y})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { delay: 0.7, duration: 0.35, ease: "easeOut" }
            }
            role="button"
            aria-label={u.name_ar}
            tabIndex={0}
            onClick={() => onSelect(u.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(u.id);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            {/* Always in the DOM (SSR can't know the reduced-motion preference); only the animation varies. */}
            <motion.circle
              r={8}
              className="pointer-events-none fill-primary/40"
              initial={{ opacity: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : { scale: [1, 2.4], opacity: [0.6, 0] }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 1.1 }
              }
            />
            {/* Oversized invisible circle to keep the tap target usable on mobile */}
            <circle r={18} className="fill-transparent" />
            <circle r={6} className="fill-primary stroke-background" strokeWidth={2} />
            <text
              y={18}
              textAnchor="middle"
              paintOrder="stroke"
              strokeLinejoin="round"
              strokeWidth={3}
              className="fill-foreground stroke-background text-[9px] font-semibold"
            >
              {u.name_ar}
            </text>
          </motion.g>
        );
      })}
    </>
  );
}
