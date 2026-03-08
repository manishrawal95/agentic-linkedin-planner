"use client";

import { lazy, memo, Suspense, useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Anchor, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Hook } from "@/types/linkedin";

const HashtagSetsPage = lazy(() => import("../hashtags/page"));

const HOOK_STYLES = [
  "Question",
  "Contrarian",
  "Story",
  "Stat",
  "Cliffhanger",
  "List",
  "Statement",
];

const HooksAndHashtagsPage = memo(function HooksAndHashtagsPage() {
  const [activeTab, setActiveTab] = useState<"hooks" | "hashtags">("hooks");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("hooks")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "hooks"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Hooks
        </button>
        <button
          onClick={() => setActiveTab("hashtags")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "hashtags"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Hashtags
        </button>
      </div>

      {activeTab === "hooks" ? (
        <HooksContent />
      ) : (
        <Suspense fallback={<div className="max-w-5xl mx-auto space-y-6"><div className="h-8 w-40 skeleton rounded-lg" /><div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}</div></div>}>
          <HashtagSetsPage />
        </Suspense>
      )}
    </div>
  );
});

HooksAndHashtagsPage.displayName = "HooksAndHashtagsPage";
export default HooksAndHashtagsPage;

const HooksContent = memo(function HooksContent() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStyle, setFilterStyle] = useState("");
  const [form, setForm] = useState({ text: "", style: "Statement" });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHooks = useCallback(async () => {
    const params = filterStyle ? `?style=${filterStyle.toLowerCase()}` : "";
    try {
      const res = await fetch(`/api/linkedin/hooks${params}`);
      const data = await res.json();
      setHooks(data.hooks || []);
    } finally {
      setLoading(false);
    }
  }, [filterStyle]);

  useEffect(() => {
    fetchHooks();
  }, [fetchHooks]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/linkedin/hooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, style: form.style.toLowerCase() }),
    });
    setShowForm(false);
    setForm({ text: "", style: "Statement" });
    fetchHooks();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/linkedin/hooks/${id}`, { method: "DELETE" });
    fetchHooks();
  };

  const handleCopyHook = async (hook: Hook) => {
    await navigator.clipboard.writeText(hook.text);
    setCopiedId(hook.id);
    setTimeout(() => setCopiedId(null), 2000);
    // Track usage
    await fetch(`/api/linkedin/hooks/${hook.id}/use`, { method: "POST" });
    fetchHooks();
  };

  const styleColors: Record<string, string> = {
    question: "bg-blue-50 text-blue-700 border-blue-200/60",
    contrarian: "bg-red-50 text-red-700 border-red-200/60",
    story: "bg-purple-50 text-purple-700 border-purple-200/60",
    stat: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    cliffhanger: "bg-amber-50 text-amber-700 border-amber-200/60",
    list: "bg-cyan-50 text-cyan-700 border-cyan-200/60",
    statement: "bg-stone-100 text-stone-700 border-stone-200/60",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 skeleton rounded-lg" />
          <div className="h-9 w-24 skeleton rounded-xl" />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 skeleton rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Hook Library</h1>
          <p className="text-sm text-stone-500 mt-1">
            {hooks.length} hook{hooks.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Add Hook
        </Button>
      </div>

      {/* Filter by style */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setFilterStyle("")}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
            !filterStyle
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          All
        </button>
        {HOOK_STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStyle(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${
              filterStyle === s
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Add hook form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-stone-900">New Hook</h3>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hook Text
            </label>
            <Textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={2}
              placeholder="The opening line that grabs attention..."
              className="rounded-xl border-stone-200/60 bg-stone-50 focus:bg-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Style
            </label>
            <Select
              value={form.style}
              onValueChange={(value) => setForm({ ...form, style: value })}
            >
              <SelectTrigger className="w-full rounded-xl border-stone-200/60 bg-stone-50">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {HOOK_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl"
            >
              Add Hook
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="rounded-xl border-stone-200/60 text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Hook list */}
      <div className="space-y-3">
        {hooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/60">
            <EmptyState
              icon={Anchor}
              title="No hooks saved yet"
              description="Add hooks manually or extract them from your best posts"
              action={{ label: "Add Hook", onClick: () => setShowForm(true) }}
            />
          </div>
        ) : (
          hooks.map((hook) => (
            <div
              key={hook.id}
              className="bg-white rounded-2xl border border-stone-200/60 p-5 flex justify-between items-start gap-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1">
                <p className="text-sm text-stone-900 font-medium leading-relaxed">
                  &ldquo;{hook.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={`capitalize rounded-lg ${styleColors[hook.style] ?? "bg-stone-100 text-stone-600 border-stone-200/60"}`}
                  >
                    {hook.style}
                  </Badge>
                  {hook.times_used > 0 && (
                    <span className="text-xs text-stone-400">
                      Used {hook.times_used}x
                    </span>
                  )}
                  {hook.avg_engagement_score != null && (
                    <span className="text-xs text-stone-700 font-semibold">
                      {(hook.avg_engagement_score * 100).toFixed(1)}% avg eng
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCopyHook(hook)}
                  className="rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  title="Copy hook to clipboard"
                >
                  {copiedId === hook.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(hook.id)}
                  className="rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

HooksContent.displayName = "HooksContent";
