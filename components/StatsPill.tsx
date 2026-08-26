"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const shareUrl = process.env.NEXT_PUBLIC_DATAFAST_SHARE_URL ?? "";

export function StatsPill() {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((json: { visitors?: number | null }) => {
        if (cancelled) return;
        if (typeof json.visitors === "number") setVisitors(json.visitors);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCount = visitors !== null;
  if (!hasCount && !shareUrl) return null;

  return (
    <div className="mt-4 flex max-w-full flex-wrap items-center gap-2">
      {hasCount && (
        <Badge variant="secondary" size="lg">
          {visitors.toLocaleString("en-US")} visitors since launch
        </Badge>
      )}
      {shareUrl && (
        <Button
          variant="ghost"
          size="sm"
          render={<a href={shareUrl} target="_blank" rel="noopener noreferrer" />}
        >
          see stats →
        </Button>
      )}
    </div>
  );
}
