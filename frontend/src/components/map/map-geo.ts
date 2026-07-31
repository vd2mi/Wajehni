// Geographic helpers for the Saudi map SVG.
// The source file (MapSVG export, Mercator projection) declares:
//   mapsvg:geoViewBox="34.492946 32.271167 55.688143 16.387460"
// i.e. left-lon, top-lat, right-lon, bottom-lat of the drawn area.

import { MAP_WIDTH, MAP_HEIGHT } from "./saudi-paths";

const LON_MIN = 34.492946;
const LAT_MAX = 32.271167;
const LON_MAX = 55.688143;
const LAT_MIN = 16.38746;

const mercator = (latDeg: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));

const MERC_TOP = mercator(LAT_MAX);
const MERC_BOTTOM = mercator(LAT_MIN);

/**
 * Project WGS84 lat/lng into SVG user-unit coordinates.
 * Rounded to 2 decimals so server and client render identical markup
 * (Math.tan/Math.log can differ in the last bits across JS engines).
 */
export function geoToMap(lat: number, lng: number): { x: number; y: number } {
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    x: round(((lng - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_WIDTH),
    y: round(((MERC_TOP - mercator(lat)) / (MERC_TOP - MERC_BOTTOM)) * MAP_HEIGHT),
  };
}

/** Approximate region bounding boxes in user units, for zoom transforms. */
export const REGION_BBOXES: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  "SA-04": { x: 360, y: 126, w: 370, h: 449 },
};

/**
 * Transform that makes a region fill the viewport, expressed about the SVG
 * canvas origin: p' = (tx, ty) + scale * p.
 * "Cover" scaling: the region spans the viewport, cropping its overflow on
 * the long axis (for SA-04 that is empty desert at the north/south edges).
 */
export function regionZoom(regionId: string, pad = 0.98) {
  const b = REGION_BBOXES[regionId];
  if (!b) return null;
  const scale = Math.max(MAP_WIDTH / b.w, MAP_HEIGHT / b.h) * pad;
  return {
    scale,
    tx: MAP_WIDTH / 2 - scale * (b.x + b.w / 2),
    ty: MAP_HEIGHT / 2 - scale * (b.y + b.h / 2),
  };
}
