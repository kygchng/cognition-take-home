"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoPoller({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function poll() {
      await fetch("/api/devin/poll", { method: "POST" });
      if (active) router.refresh();
    }

    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, router]);

  return null;
}
