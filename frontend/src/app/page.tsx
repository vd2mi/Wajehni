"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SaudiMap, REGIONS } from "@/components/map/saudi-map";
import { UniversityPins, type UniversityPin } from "@/components/map/university-pins";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { getCatalog, type Catalog } from "@/lib/api";
import { t } from "@/lib/i18n";

// Fallback when the backend is unreachable — mirrors catalog.json.
const FALLBACK_UNIVERSITIES: Record<string, UniversityPin[]> = {
  "SA-04": [
    { id: "iau", name_ar: "جامعة الإمام عبدالرحمن بن فيصل", lat: 26.398, lng: 50.196 },
  ],
};

function MapFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionParam = searchParams.get("region");
  const zoomed = regionParam && REGIONS[regionParam]?.active ? regionParam : null;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => {});
  }, []);

  const universities: UniversityPin[] = zoomed
    ? catalog?.regions.find((r) => r.id === zoomed)?.universities ??
      FALLBACK_UNIVERSITIES[zoomed] ??
      []
    : [];

  const crumbs: Crumb[] = [
    { label: t.breadcrumb.home, href: "/" },
    ...(zoomed ? [{ label: REGIONS[zoomed].ar }] : []),
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <header className="shrink-0 px-4 pt-6 text-center sm:pt-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {zoomed ? REGIONS[zoomed].ar : t.map.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {zoomed ? t.map.pickUniversity : t.map.subtitle}
        </p>
      </header>

      <div className="min-h-0 flex-1 px-2 pb-4 pt-2 sm:px-6">
        <SaudiMap
          zoomRegion={zoomed}
          onRegionSelect={(regionId) => router.push(`/?region=${regionId}`)}
        >
          <AnimatePresence>
            {zoomed && (
              <UniversityPins
                key="pins"
                universities={universities}
                onSelect={(universityId) => router.push(`/university/${universityId}`)}
              />
            )}
          </AnimatePresence>
        </SaudiMap>
      </div>
    </div>
  );
}

export default function HomePage() {
  // useSearchParams requires a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <MapFlow />
    </Suspense>
  );
}
