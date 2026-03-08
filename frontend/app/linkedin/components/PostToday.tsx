"use client";

import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, PenTool, Lightbulb, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";

interface PostTodayDraft {
  id: number;
  topic: string;
  content: string;
  confidence: number | null;
  pillar_name: string | null;
  pillar_color: string | null;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface PostTodayIdea {
  id: number;
  topic: string;
  score: number;
  hook_style: string | null;
  pillar_name: string | null;
  pillar_color: string | null;
}

interface PostTodayResponse {
  found: boolean;
  source?: "scheduled" | "best_draft" | "idea";
  draft?: PostTodayDraft;
  idea?: PostTodayIdea;
  message?: string;
}

const PostToday = memo(function PostToday() {
  const router = useRouter();
  const { data, loading, error } = useApi<PostTodayResponse>("/api/linkedin/post-today");
  const [approving, setApproving] = useState(false);

  const handleApproveIdea = useCallback(async (ideaId: number) => {
    setApproving(true);
    try {
      const res = await fetch(`/api/linkedin/ideas/${ideaId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Approve failed (${res.status})`);
      }
      toast.success("Idea approved — drafts generating in background");
      router.push("/linkedin/drafts");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  }, [router]);

  if (loading) {
    return <Skeleton className="h-14 w-full rounded-2xl" />;
  }

  if (error || !data?.found) {
    return null; // Don't show anything if no suggestion available
  }

  const { source, draft, idea } = data;

  // Draft available — go edit it
  if ((source === "scheduled" || source === "best_draft") && draft) {
    return (
      <button
        onClick={() => router.push("/linkedin/drafts")}
        className="w-full flex items-center gap-4 p-4 bg-amber-50 border border-amber-200/60 rounded-2xl hover:bg-amber-100/80 transition-all group text-left"
      >
        <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
          <Send className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-stone-900">Post Today</p>
            {source === "scheduled" && draft.scheduled_time && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200/60 text-[10px]">
                {draft.scheduled_time}
              </Badge>
            )}
            {draft.pillar_name && (
              <span className="flex items-center gap-1 text-[11px] text-stone-400">
                {draft.pillar_color && (
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: draft.pillar_color }} />
                )}
                {draft.pillar_name}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{draft.topic}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors shrink-0" />
      </button>
    );
  }

  // Only idea available — approve to generate draft
  if (source === "idea" && idea) {
    return (
      <div className="flex items-center gap-4 p-4 bg-stone-50 border border-stone-200/60 rounded-2xl">
        <div className="p-2.5 bg-stone-100 rounded-xl shrink-0">
          <Lightbulb className="w-5 h-5 text-stone-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900">No drafts ready</p>
          <p className="text-xs text-stone-500 mt-0.5 truncate">
            Top idea: {idea.topic}
          </p>
        </div>
        <Button
          onClick={() => handleApproveIdea(idea.id)}
          disabled={approving}
          size="sm"
          className="rounded-xl gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {approving ? "Drafting..." : "Approve & Draft"}
        </Button>
      </div>
    );
  }

  return null;
});

PostToday.displayName = "PostToday";
export default PostToday;
