"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { getCatalog, type CatalogUniversity, type CatalogRegion } from "@/lib/api";
import { t } from "@/lib/i18n";

export default function UniversityPage() {
  const params = useParams<{ universityId: string }>();
  const universityId = params.universityId;

  const [region, setRegion] = useState<CatalogRegion | null>(null);
  const [university, setUniversity] = useState<CatalogUniversity | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");

  useEffect(() => {
    getCatalog()
      .then((catalog) => {
        for (const r of catalog.regions) {
          const u = r.universities.find((u) => u.id === universityId);
          if (u) {
            setRegion(r);
            setUniversity(u);
            setStatus("ready");
            return;
          }
        }
        setStatus("missing");
      })
      .catch(() => setStatus("error"));
  }, [universityId]);

  const crumbs: Crumb[] = [
    { label: t.breadcrumb.home, href: "/" },
    ...(region ? [{ label: region.name_ar, href: `/?region=${region.id}` }] : []),
    ...(university ? [{ label: university.name_ar }] : []),
  ];

  // Group colleges by track, preserving catalog order
  const tracks: { name: string; colleges: NonNullable<typeof university>["colleges"] }[] = [];
  if (university) {
    for (const college of university.colleges) {
      const trackName = college.track_ar ?? "";
      const existing = tracks.find((t) => t.name === trackName);
      if (existing) existing.colleges.push(college);
      else tracks.push({ name: trackName, colleges: [college] });
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={crumbs} />
      </div>

      {status === "loading" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.loading}</p>
      )}
      {status === "error" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.loadError}</p>
      )}
      {status === "missing" && (
        <p className="px-4 py-16 text-center text-muted-foreground">{t.common.notFound}</p>
      )}

      {status === "ready" && university && (
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <header className="py-8 sm:py-10">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {university.name_ar}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              {university.name_en} — {university.city_ar}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{t.university.pickMajor}</p>
          </header>

          <div className="space-y-10">
            {tracks.map((track) => (
              <section key={track.name}>
                {track.name && (
                  <h2 className="mb-4 text-lg font-semibold">{track.name}</h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {track.colleges.map((college) => (
                    <Card key={college.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base leading-snug">
                          {college.name_ar}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{college.name_en}</p>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {college.majors.map((major) => (
                            <li key={major.id}>
                              <Link
                                href={`/major/${university.id}/${college.id}/${major.id}`}
                                className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                              >
                                <span>{major.name_ar}</span>
                                <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
