"use client";

import { useState } from "react";
import { Brain, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";

interface BriefingResponse {
  briefing: string;
  priority_action: string;
  generated_at: string;
  cached: boolean;
  stale: boolean;
  generated_by: string;
}

export default function MorningBriefing() {
  const { data, loading, error, refetch, mutate } =
    useApi<BriefingResponse>("/api/linkedin/briefing");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/linkedin/briefing/refresh", {
        method: "POST",
      });
      if (res.ok) {
        const newData = await res.json();
        mutate(newData);
      }
    } catch (err) {
      console.error("MorningBriefing.handleRefresh: POST /api/linkedin/briefing/refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-stone-800 rounded-2xl p-5 space-y-3">
        <div className="h-4 w-32 skeleton rounded-lg opacity-20" />
        <div className="h-16 skeleton rounded-xl opacity-10" />
        <div className="h-4 w-64 skeleton rounded-lg opacity-10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-stone-800 rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Morning Briefing
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-6 px-2 text-[10px] text-stone-400 hover:text-white hover:bg-stone-700 rounded-lg"
          >
            Retry
          </Button>
        </div>
        <p className="text-sm text-stone-400 mt-3">
          {error ? "Couldn't load your briefing. Check that the backend is running." : "No briefing data available yet."}
        </p>
      </div>
    );
  }

  const timeAgo = (() => {
    if (!data.generated_at) return "";
    const diff = Date.now() - new Date(data.generated_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  })();

  return (
    <div className="bg-stone-800 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stone-700/40 to-transparent rounded-bl-full" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Morning Briefing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-500">
              {timeAgo}
              {data.generated_by === "fallback" && " (offline)"}
            </span>
            {data.stale && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-6 px-2 text-[10px] text-stone-400 hover:text-white hover:bg-stone-700 rounded-lg"
              >
                {refreshing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Briefing text */}
        <p className="text-sm sm:text-[15px] text-stone-200 leading-relaxed">
          {data.briefing}
        </p>

        {/* Priority action */}
        {data.priority_action && (
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
            <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium text-stone-300">
              {data.priority_action}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
