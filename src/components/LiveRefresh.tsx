"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches server data every `seconds` so the board stays live 24x7 without a manual reload. */
export function LiveRefresh({ seconds = 60, light = false }: { seconds?: number; light?: boolean }) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setTick((t) => t + 1);
      }
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${light ? "text-white/80" : "text-muted"}`} title={`Auto-refreshes every ${seconds}s`}>
      <span className="relative flex h-2 w-2">
        <span className="pulse absolute inline-flex h-full w-full rounded-full bg-ok" />
      </span>
      Live · updates 24x7{tick > 0 ? ` · refreshed ${tick}x` : ""}
    </span>
  );
}
