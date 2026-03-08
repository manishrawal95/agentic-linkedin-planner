"use client";

import { useApi } from "@/hooks/use-api";
import { TrendingUp, TrendingDown, Minus, Award, Flame } from "lucide-react";

interface GrowthData {
  hit_rate: { recent: number; overall: number; posts: string[] };
  posts_this_week: number;
  posts_target: number;
  streak_weeks: number;
  top_learning: string | null;
  health_score: number | null;
}

export default function GrowthPulse() {
  const { data, loading } = useApi<GrowthData>(
    "/api/linkedin/suggestions/growth-pulse"
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hitTrend =
    data.hit_rate.recent > data.hit_rate.overall
      ? "up"
      : data.hit_rate.recent < data.hit_rate.overall
        ? "down"
        : "flat";

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
        <Flame className="w-4 h-4 text-stone-400" />
        Growth Pulse
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Hit Rate */}
        <div className="bg-white rounded-xl border border-stone-200/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              Hit Rate
            </p>
            {hitTrend === "up" && (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            )}
            {hitTrend === "down" && (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            {hitTrend === "flat" && (
              <Minus className="w-3 h-3 text-stone-400" />
            )}
          </div>
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {Math.round(data.hit_rate.recent * 100)}%
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            % of recent posts that outperformed
          </p>
          <div className="flex gap-0.5 mt-1.5">
            {data.hit_rate.posts.map((classification, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  classification === "hit"
                    ? "bg-emerald-400"
                    : classification === "miss"
                      ? "bg-red-400"
                      : "bg-stone-300"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> hit
            </span>
            <span className="flex items-center gap-1 text-[10px] text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block" /> avg
            </span>
            <span className="flex items-center gap-1 text-[10px] text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> miss
            </span>
          </div>
        </div>

        {/* Posts This Week */}
        <div className="bg-white rounded-xl border border-stone-200/60 p-3">
          <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
            This Week
          </p>
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {data.posts_this_week}
            <span className="text-sm font-normal text-stone-400">
              /{data.posts_target}
            </span>
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            posts toward weekly goal
          </p>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-1.5">
            <div
              className="bg-stone-600 h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (data.posts_this_week / Math.max(1, data.posts_target)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white rounded-xl border border-stone-200/60 p-3">
          <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
            Streak
          </p>
          <p className="text-lg font-semibold text-stone-900 tracking-tight">
            {data.streak_weeks}
            <span className="text-sm font-normal text-stone-400"> wk</span>
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            consecutive weeks posting
          </p>
          {data.streak_weeks >= 4 && (
            <div className="flex items-center gap-1 mt-1">
              <Award className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-600 font-medium">
                On fire
              </span>
            </div>
          )}
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-xl border border-stone-200/60 p-3">
          <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">
            Content Health
          </p>
          {data.health_score !== null ? (
            <>
              <p className="text-lg font-semibold text-stone-900 tracking-tight">
                {data.health_score}
                <span className="text-sm font-normal text-stone-400">/10</span>
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                AI strategy assessment
              </p>
              <div
                className={`text-[10px] font-medium mt-1 ${
                  data.health_score >= 7
                    ? "text-emerald-600"
                    : data.health_score >= 4
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {data.health_score >= 7
                  ? "Strong"
                  : data.health_score >= 4
                    ? "Growing"
                    : "Needs work"}
              </div>
            </>
          ) : (
            <p className="text-xs text-stone-400 mt-1">
              Run a strategy review in Analytics to get your score
            </p>
          )}
        </div>
      </div>

      {/* Top Learning */}
      {data.top_learning && (
        <div className="bg-stone-50 rounded-xl border border-stone-200/60 px-3.5 py-2.5">
          <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-0.5">
            Top Confirmed Learning
          </p>
          <p className="text-xs text-stone-700 leading-relaxed">
            {data.top_learning}
          </p>
        </div>
      )}
    </div>
  );
}
