"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { Draft } from "@/types/linkedin";

interface DraftContext {
  word_sweet_spot: [number, number] | null;
  hook_performance: Array<{
    style: string;
    avg_engagement: number;
    count: number;
  }>;
  similar_posts: Array<{
    id: number;
    content_preview: string;
    classification: string | null;
  }>;
  confidence: number | null;
}

interface DraftAmbientIndicatorsProps {
  draft: Draft;
  wordCount: number;
}

function cleanPreview(text: string, maxLen: number): string {
  let t = text.trim();
  // Cap at maxLen, cutting at last word boundary
  if (t.length > maxLen) {
    const trimmed = t.slice(0, maxLen);
    const lastSpace = trimmed.lastIndexOf(" ");
    t = lastSpace > maxLen * 0.4 ? trimmed.slice(0, lastSpace) : trimmed;
  }
  // If text looks cut off (doesn't end with sentence punctuation), add ellipsis
  if (!/[.!?…"']$/.test(t)) {
    t = t.replace(/[\s,;:\-–—]+$/, "") + "…";
  }
  return t;
}

export default function DraftAmbientIndicators({
  draft,
  wordCount,
}: DraftAmbientIndicatorsProps) {
  const { data } = useApi<DraftContext>(
    `/api/linkedin/drafts/${draft.id}/context`
  );
  const [showSimilar, setShowSimilar] = useState(false);

  if (!data) return null;

  const { word_sweet_spot, hook_performance, similar_posts, confidence } = data;

  const hasAnyData =
    word_sweet_spot !== null ||
    hook_performance.length > 0 ||
    similar_posts.length > 0 ||
    confidence !== null;

  if (!hasAnyData) return null;

  // Word count sweet spot
  const inRange =
    word_sweet_spot !== null &&
    wordCount >= word_sweet_spot[0] &&
    wordCount <= word_sweet_spot[1];
  const showWordIndicator = word_sweet_spot !== null && wordCount > 0;

  return (
    <div className="mt-2 space-y-2.5">
      {/* Row 1: Word sweet spot bar with label */}
      {showWordIndicator && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-400 shrink-0 w-16">
            Length
          </span>
          <div className="flex-1 h-1.5 bg-stone-100 rounded-full relative overflow-hidden">
            {/* Optimal range highlight */}
            <div
              className="absolute h-full bg-emerald-200 rounded-full"
              style={{
                left: `${Math.min(100, (word_sweet_spot[0] / (word_sweet_spot[1] * 1.5)) * 100)}%`,
                width: `${Math.min(100, ((word_sweet_spot[1] - word_sweet_spot[0]) / (word_sweet_spot[1] * 1.5)) * 100)}%`,
              }}
            />
            {/* Current position dot */}
            <div
              className={`absolute w-2 h-2 rounded-full -top-[1px] transition-all ${
                inRange ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{
                left: `${Math.min(98, (wordCount / (word_sweet_spot[1] * 1.5)) * 100)}%`,
              }}
            />
          </div>
          <span
            className={`text-[10px] font-medium shrink-0 ${
              inRange ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {inRange
              ? `In sweet spot (${word_sweet_spot[0]}–${word_sweet_spot[1]})`
              : wordCount < word_sweet_spot[0]
                ? `Short — aim for ${word_sweet_spot[0]}+`
                : `Long — trim to ~${word_sweet_spot[1]}`}
          </span>
        </div>
      )}

      {/* Row 2: Confidence + best hook styles — single line */}
      {(confidence !== null || hook_performance.length > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {confidence !== null && (
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  confidence >= 0.7
                    ? "bg-emerald-400"
                    : confidence >= 0.5
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
              />
              <span className="text-[10px] text-stone-500">
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>
          )}
          {hook_performance.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-400">Best hooks:</span>
              {hook_performance.slice(0, 2).map((h) => (
                <span
                  key={h.style}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60 capitalize"
                >
                  {h.style} ({(h.avg_engagement * 100).toFixed(0)}% eng)
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Similar posts — collapsible */}
      {similar_posts.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowSimilar((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            {similar_posts.length} similar post{similar_posts.length !== 1 ? "s" : ""}
            {" — "}
            {similar_posts.filter((p) => p.classification === "hit").length > 0
              ? `${similar_posts.filter((p) => p.classification === "hit").length} hit`
              : "none were hits"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showSimilar ? "rotate-180" : ""}`} />
          </button>
          {showSimilar && (
            <div className="space-y-1 mt-1.5 pl-1">
              {similar_posts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 text-[11px] text-stone-500"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      p.classification === "hit"
                        ? "bg-emerald-400"
                        : p.classification === "miss"
                          ? "bg-red-400"
                          : "bg-stone-300"
                    }`}
                  />
                  <span>{cleanPreview(p.content_preview, 80)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
