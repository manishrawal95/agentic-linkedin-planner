"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Repeat,
  Target,
  Lightbulb,
  PenTool,
  AlertTriangle,
  Calendar,
  TrendingDown,
  Clock,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import type { Suggestion } from "@/types/linkedin";

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  "refresh-cw": RefreshCw,
  repeat: Repeat,
  target: Target,
  lightbulb: Lightbulb,
  "pen-tool": PenTool,
  "alert-triangle": AlertTriangle,
  calendar: Calendar,
  "trending-down": TrendingDown,
  clock: Clock,
};

const TYPE_COLORS: Record<string, string> = {
  unanalyzed_post: "border-l-amber-400 bg-amber-50/40",
  stale_analysis: "border-l-orange-400 bg-orange-50/40",
  due_series: "border-l-violet-400 bg-violet-50/40",
  pillar_gap: "border-l-rose-400 bg-rose-50/40",
  pending_ideas: "border-l-sky-400 bg-sky-50/40",
  stale_draft: "border-l-stone-400 bg-stone-50/40",
  goal_at_risk: "border-l-red-400 bg-red-50/40",
  calendar_gap: "border-l-blue-400 bg-blue-50/40",
  hit_rate_drop: "border-l-red-500 bg-red-50/40",
  schedule_ready: "border-l-emerald-400 bg-emerald-50/40",
};

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export default function ActionBrief() {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<SuggestionsResponse>(
    "/api/linkedin/suggestions"
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState<Set<number>>(new Set());

  const suggestions = (data?.suggestions ?? []).filter(
    (s) => !dismissed.has(s.id)
  );

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const handleAction = useCallback(
    async (suggestion: Suggestion) => {
      // Inline action for unanalyzed posts
      if (
        (suggestion.type === "unanalyzed_post" ||
          suggestion.type === "stale_analysis") &&
        suggestion.entity_id
      ) {
        setAnalyzing((prev) => new Set(prev).add(suggestion.entity_id as number));
        try {
          const res = await fetch(
            `/api/linkedin/analyze/${suggestion.entity_id}`,
            { method: "POST" }
          );
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Analysis failed");
          }
          toast.success("Analysis started", {
            description: "Results will update in the background",
          });
          handleDismiss(suggestion.id);
          setTimeout(() => refetch(), 3000);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Analysis failed";
          toast.error(msg);
        } finally {
          setAnalyzing((prev) => {
            const next = new Set(prev);
            next.delete(suggestion.entity_id as number);
            return next;
          });
        }
        return;
      }

      // Default: navigate to action URL
      router.push(suggestion.action_url);
    },
    [router, handleDismiss, refetch]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 skeleton rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/60 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100/60">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              All caught up
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Nothing needs your attention right now. Keep the momentum going.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Attention Needed
          <span className="text-xs font-normal text-stone-400 ml-1">
            {suggestions.length} item{suggestions.length !== 1 ? "s" : ""}
          </span>
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 5).map((suggestion) => {
          const Icon = ICON_MAP[suggestion.icon] ?? Target;
          const colorClass =
            TYPE_COLORS[suggestion.type] ?? "border-l-stone-300 bg-stone-50/40";
          const isAnalyzing = analyzing.has(suggestion.entity_id ?? -1);

          return (
            <div
              key={suggestion.id}
              className={`border-l-[3px] rounded-xl p-3.5 ${colorClass} group relative transition-all duration-200`}
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-white/80 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-stone-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 leading-snug">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs font-medium rounded-lg gap-1 hover:bg-white/80"
                    onClick={() => handleAction(suggestion)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        {suggestion.action_label}
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </Button>

                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/80 transition-all"
                    aria-label="Dismiss suggestion"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
