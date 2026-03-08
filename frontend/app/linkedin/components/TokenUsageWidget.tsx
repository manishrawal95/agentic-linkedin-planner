"use client";

import { memo } from "react";
import { Cpu, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { useApi } from "@/hooks/use-api";

interface FeatureUsage {
  feature: string;
  call_count: number;
  total_input: number;
  total_output: number;
  total_tokens: number;
  avg_duration_ms: number;
}

interface DailyUsage {
  date: string;
  total_tokens: number;
  call_count: number;
}

interface UsageSummary {
  by_feature: FeatureUsage[];
  daily: DailyUsage[];
  totals: {
    total_calls: number;
    total_input: number;
    total_output: number;
    total_tokens: number;
  };
}

const FEATURE_LABELS: Record<string, string> = {
  analysis: "Post Analysis",
  batch_classify: "Batch Classify",
  batch_learnings: "Learning Extraction",
  briefing: "Morning Briefing",
  draft: "Draft Generation",
  hook_extract: "Hook Extraction",
  ideation: "Idea Generation",
  ideation_score: "Idea Scoring",
  improve_draft: "Draft Improvement",
  memory_build: "Memory Build",
  memory_update: "Memory Update",
  playbook: "Playbook",
  post_ideas: "Post Ideas",
  profile: "Profile",
  scheduler: "Auto-Schedule",
  auto_fill: "Auto-Fill",
  unknown: "Other",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const TokenUsageWidget = memo(function TokenUsageWidget() {
  const { data, loading, error, refetch } = useApi<UsageSummary>(
    "/api/linkedin/token-usage/summary"
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
        <ErrorCard message={error} onRetry={refetch} />
      </div>
    );
  }

  const totals = data?.totals;
  const features = data?.by_feature ?? [];
  const daily = data?.daily ?? [];

  if (!totals || totals.total_calls === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-stone-400" />
          AI Token Usage
        </h2>
        <p className="text-sm text-stone-500">No LLM calls recorded yet.</p>
      </div>
    );
  }

  // Find max daily for bar chart scaling
  const maxDaily = Math.max(...daily.map((d) => d.total_tokens), 1);

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
      <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-stone-400" />
        AI Token Usage
        <span className="text-[11px] font-normal text-stone-400 ml-auto">Last 30 days</span>
      </h2>

      {/* Totals row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {formatTokens(totals.total_tokens)}
          </p>
          <p className="text-[11px] text-stone-500">Total Tokens</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {totals.total_calls}
          </p>
          <p className="text-[11px] text-stone-500">LLM Calls</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {features.length}
          </p>
          <p className="text-[11px] text-stone-500">Features</p>
        </div>
      </div>

      {/* Daily mini bar chart */}
      {daily.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-stone-600 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Daily Usage (14 days)
          </p>
          <div className="flex items-end gap-[3px] h-16">
            {daily.map((d) => {
              const height = Math.max(2, (d.total_tokens / maxDaily) * 100);
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-stone-300 rounded-t-sm transition-all hover:bg-stone-500"
                  style={{ height: `${height}%` }}
                  title={`${d.date}: ${formatTokens(d.total_tokens)} tokens (${d.call_count} calls)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-stone-400">
              {daily[0]?.date ? new Date(daily[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
            </span>
            <span className="text-[10px] text-stone-400">
              {daily.at(-1)?.date ? new Date(daily.at(-1)!.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
            </span>
          </div>
        </div>
      )}

      {/* Feature breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-600">By Feature</p>
        {features.slice(0, 8).map((f) => {
          const pct = totals.total_tokens > 0
            ? (f.total_tokens / totals.total_tokens) * 100
            : 0;
          return (
            <div key={f.feature} className="flex items-center gap-2 text-xs">
              <span className="text-stone-600 w-28 truncate" title={f.feature}>
                {FEATURE_LABELS[f.feature] ?? f.feature}
              </span>
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-400 rounded-full transition-all"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <span className="text-stone-500 w-14 text-right tabular-nums">
                {formatTokens(f.total_tokens)}
              </span>
              <span className="text-stone-400 w-8 text-right tabular-nums">
                {f.call_count}x
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

TokenUsageWidget.displayName = "TokenUsageWidget";
export default TokenUsageWidget;
