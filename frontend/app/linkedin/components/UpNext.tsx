"use client";

import { useRouter } from "next/navigation";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";

interface UpNextEntry {
  id: number;
  scheduled_date: string;
  scheduled_time: string | null;
  draft_id: number | null;
  draft_topic: string | null;
  pillar_name: string | null;
  pillar_color: string | null;
  status: string;
}

interface UpNextResponse {
  entries: UpNextEntry[];
}

export default function UpNext() {
  const router = useRouter();
  const { data, loading } = useApi<UpNextResponse>(
    "/api/linkedin/suggestions/up-next"
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-28 skeleton rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-400" />
          Up Next
        </h2>
        <div className="bg-stone-50 rounded-xl border border-stone-200/60 p-4 text-center">
          <p className="text-xs text-stone-500">
            No upcoming scheduled posts. Generate ideas to fill your calendar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-stone-400" />
        Up Next
      </h2>

      <div className="space-y-2">
        {entries.map((entry) => {
          const date = new Date(entry.scheduled_date + "T00:00:00");
          const isToday =
            date.toDateString() === new Date().toDateString();
          const isTomorrow =
            date.toDateString() ===
            new Date(Date.now() + 86400000).toDateString();

          const dateLabel = isToday
            ? "Today"
            : isTomorrow
              ? "Tomorrow"
              : date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

          return (
            <button
              key={entry.id}
              onClick={() =>
                entry.draft_id
                  ? router.push(`/linkedin/drafts`)
                  : router.push("/linkedin/calendar")
              }
              className="w-full text-left bg-white rounded-xl border border-stone-200/60 p-3 hover:bg-stone-50 hover:border-stone-200 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Date pill */}
                <div
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-center ${
                    isToday
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider leading-none">
                    {dateLabel}
                  </p>
                  {entry.scheduled_time && (
                    <p className="text-[10px] mt-0.5 opacity-70 flex items-center gap-0.5 justify-center">
                      <Clock className="w-2.5 h-2.5" />
                      {entry.scheduled_time}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {entry.draft_topic ?? "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.pillar_name && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 rounded-full"
                        style={{
                          backgroundColor: `${entry.pillar_color}15`,
                          color: entry.pillar_color ?? undefined,
                          borderColor: `${entry.pillar_color}30`,
                        }}
                      >
                        {entry.pillar_name}
                      </Badge>
                    )}
                    <span className="text-[10px] text-stone-400 capitalize">
                      {entry.status}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
