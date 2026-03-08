"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { CheckCircle2, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuthStatus } from "@/types/linkedin";

const LinkedInAuthStatus = memo(function LinkedInAuthStatus() {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/auth/status");
      if (res.ok) setStatus(await res.json());
    } catch (err) {
      console.error("LinkedInAuthStatus.fetch_: GET /api/linkedin/auth/status failed:", err);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (!status) return null;

  if (status.authenticated) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-blue-50 text-[#0a66c2] border-blue-200/60 hover:bg-blue-50 rounded-xl px-3 py-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        LinkedIn connected
      </Badge>
    );
  }

  return (
    <a
      href="/api/linkedin/auth/start"
      className="inline-flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 hover:bg-stone-100 transition-colors font-medium"
    >
      <Link2 className="w-3.5 h-3.5 shrink-0" />
      Connect LinkedIn
    </a>
  );
});

LinkedInAuthStatus.displayName = "LinkedInAuthStatus";
export default LinkedInAuthStatus;
