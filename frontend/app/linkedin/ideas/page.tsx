"use client";

import { useCallback, useState } from "react";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorCard } from "@/components/ui/error-card";
import { useApi } from "@/hooks/use-api";
import { useBackgroundTask } from "@/hooks/use-background-task";
import { toast } from "sonner";
import type { Idea } from "@/types/linkedin";
import IdeaCard from "./idea-card";

interface IdeasResponse {
  ideas: Idea[];
}

export default function IdeasPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useApi<IdeasResponse>("/api/linkedin/ideas");
  const [topicHint, setTopicHint] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "drafted" | "rejected">("all");

  const { running: generating, launch: launchGenerate } = useBackgroundTask<{ ideas: Idea[] }>({
    key: "ideas_generate",
    onDone: (result) => {
      const count = result?.ideas?.length ?? 0;
      setTopicHint("");
      refetch();
    },
    successMessage: "Ideas generated",
  });

  const ideas = data?.ideas ?? [];

  const handleGenerate = useCallback(() => {
    const params = new URLSearchParams();
    if (topicHint.trim()) params.set("topic_hint", topicHint.trim());
    launchGenerate(
      `/api/linkedin/ideas/generate?${params}`,
      { method: "POST" },
      "Generating ideas — you can navigate away safely"
    );
  }, [topicHint, launchGenerate]);

  const handleApprove = useCallback(async (id: number) => {
    const res = await fetch(`/api/linkedin/ideas/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.detail || "Failed to approve idea");
      return;
    }
    toast.success("Drafts generating in background");
    await refetch();
  }, [refetch]);

  const handleReject = useCallback(async (id: number) => {
    const res = await fetch(`/api/linkedin/ideas/${id}/reject`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to reject idea");
      return;
    }
    await refetch();
  }, [refetch]);

  const filteredIdeas = filter === "all" ? ideas : ideas.filter((i) => i.status === filter);

  const counts = {
    all: ideas.length,
    pending: ideas.filter((i) => i.status === "pending").length,
    drafted: ideas.filter((i) => i.status === "drafted").length,
    rejected: ideas.filter((i) => i.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-40 skeleton rounded-lg" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Idea Engine
        </h1>
        <ErrorCard message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
            Idea Engine
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {counts.pending} pending &middot; {counts.drafted} drafted
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl gap-1.5 active:scale-[0.98] transition-all w-full sm:w-auto h-11 sm:h-9 text-[15px] sm:text-sm"
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4" />
          )}
          {generating ? "Generating..." : "Generate Ideas"}
        </Button>
      </div>

      {/* Topic hint input */}
      <Input
        type="text"
        value={topicHint}
        onChange={(e) => setTopicHint(e.target.value)}
        placeholder="Optional: steer ideas toward a topic..."
        className="rounded-xl border-stone-200 h-11 sm:h-9 text-base sm:text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !generating) {
            e.preventDefault();
            handleGenerate();
          }
        }}
      />

      {/* Filter pills — horizontally scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {(["all", "pending", "drafted", "rejected"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === status
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {counts[status] > 0 && (
                <span className="ml-1 opacity-75">({counts[status]})</span>
              )}
            </button>
          )
        )}
      </div>

      {/* Ideas list */}
      {filteredIdeas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/60 p-8">
          <EmptyState
            icon={Lightbulb}
            title={
              filter !== "all"
                ? `No ${filter} ideas`
                : "No ideas yet"
            }
            description={
              filter !== "all"
                ? "Try a different filter or generate new ideas."
                : "Generate AI-powered ideas based on your creator memory, content pillars, and past performance."
            }
            action={
              filter === "all"
                ? {
                    label: generating
                      ? "Generating..."
                      : "Generate Ideas",
                    onClick: handleGenerate,
                    loading: generating,
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Generating overlay */}
      {generating && ideas.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/60">
          <RefreshCw className="w-4 h-4 animate-spin text-stone-600" />
          <span className="text-sm text-stone-600">
            Generating new ideas from your memory and content pillars...
          </span>
        </div>
      )}
    </div>
  );
}
