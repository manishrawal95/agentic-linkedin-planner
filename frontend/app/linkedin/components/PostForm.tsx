"use client";

import { memo, useState } from "react";
import { X, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Pillar } from "@/types/linkedin";

interface PostFormProps {
  pillars: Pillar[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  initial?: Record<string, unknown>;
}

const POST_TYPES = ["text", "carousel", "personal image", "social proof image", "poll", "video", "article"];
const CTA_TYPES = ["none", "question", "link", "engagement-bait", "advice"];
const HOOK_STYLES = ["", "Question", "Contrarian", "Story", "Stat", "Cliffhanger", "List", "Statement"];

const PostForm = memo(function PostForm({
  pillars,
  onSubmit,
  onCancel,
  initial,
}: PostFormProps) {
  const initialAuthor = (initial?.author as string) || "me";
  const [authorMode, setAuthorMode] = useState<"me" | "other">(
    initialAuthor === "me" ? "me" : "other"
  );
  const [authorName, setAuthorName] = useState(
    initialAuthor === "me" ? "" : initialAuthor
  );
  const [form, setForm] = useState({
    author: initialAuthor,
    content: (initial?.content as string) || "",
    post_url: (initial?.post_url as string) || "",
    post_type: (initial?.post_type as string) || "text",
    cta_type: (initial?.cta_type as string) || "none",
    hook_line: (initial?.hook_line as string) || "",
    hook_style: (initial?.hook_style as string) || "",
    posted_at: ((initial?.posted_at as string) || "").slice(0, 16),
    pillar_id: (initial?.pillar_id as number) || "",
    topic_tags: (initial?.topic_tags as string) || "",
  });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        pillar_id: form.pillar_id || null,
        topic_tags: form.topic_tags
          ? form.topic_tags.split(",").map((t) => t.trim())
          : [],
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (!form.content.trim()) return;
    setAutoFilling(true);
    try {
      const res = await fetch("/api/linkedin/posts/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: form.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          hook_line: data.hook_line || prev.hook_line,
          hook_style: data.hook_style || prev.hook_style,
          cta_type: data.cta_type || prev.cta_type,
          post_type: data.post_type || prev.post_type,
          topic_tags: Array.isArray(data.topic_tags)
            ? data.topic_tags.join(", ")
            : prev.topic_tags,
        }));
      }
    } catch (err) {
      console.error("PostForm.handleAutoFill: POST /api/linkedin/posts/auto-fill failed:", err);
    } finally {
      setAutoFilling(false);
    }
  };

  const handleExtractHook = async () => {
    if (!form.content.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/linkedin/hooks/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: form.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          hook_line: data.hook_text || prev.hook_line,
          hook_style: data.style || prev.hook_style,
        }));
      }
    } catch (err) {
      console.error("PostForm.handleExtractHook: POST /api/linkedin/hooks/extract failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-5"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-stone-900 tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-stone-400" />
          {initial ? "Edit Post" : "Add Post"}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 rounded-xl text-stone-400 hover:text-stone-700"
          aria-label="Close form"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Author
          </label>
          <Select
            value={authorMode}
            onValueChange={(v: string) => {
              const mode = v as "me" | "other";
              setAuthorMode(mode);
              if (mode === "me") {
                setAuthorName("");
                setForm({ ...form, author: "me" });
              } else {
                setForm({ ...form, author: authorName || "other" });
              }
            }}
          >
            <SelectTrigger className="rounded-xl border-stone-200 h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Me</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {authorMode === "other" && (
            <Input
              type="text"
              placeholder="Person's name"
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                setForm({ ...form, author: e.target.value || "other" });
              }}
              className="mt-2 rounded-xl border-stone-200"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Post Type
          </label>
          <Select value={form.post_type} onValueChange={(v) => setForm({ ...form, post_type: v })}>
            <SelectTrigger className="rounded-xl border-stone-200 h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Content
        </label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={6}
          className="rounded-xl border-stone-200 focus-visible:ring-stone-400"
          placeholder="Paste the LinkedIn post content here..."
          required
        />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-stone-400">
            {form.content.split(/\s+/).filter(Boolean).length} words
          </p>
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={autoFilling || !form.content.trim()}
            className="flex items-center gap-1.5 text-xs text-stone-600 font-medium hover:text-stone-900 disabled:opacity-40 transition-colors"
          >
            <Zap className="w-3 h-3" />
            {autoFilling ? "Filling..." : "Auto-fill fields"}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-stone-600">
            Hook Line
          </label>
          <button
            type="button"
            onClick={handleExtractHook}
            disabled={extracting || !form.content.trim()}
            className="flex items-center gap-1 text-xs text-stone-600 font-medium hover:text-stone-900 disabled:opacity-40 transition-colors"
          >
            <Zap className="w-3 h-3" />
            {extracting ? "Extracting..." : "Extract"}
          </button>
        </div>
        <Input
          type="text"
          value={form.hook_line}
          onChange={(e) => setForm({ ...form, hook_line: e.target.value })}
          className="rounded-xl border-stone-200"
          placeholder="First line of the post"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Hook Style
          </label>
          <Select value={form.hook_style || "__none__"} onValueChange={(v) => setForm({ ...form, hook_style: v === "__none__" ? "" : v })}>
            <SelectTrigger className="rounded-xl border-stone-200 h-10 text-sm">
              <SelectValue placeholder="No style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No style</SelectItem>
              {HOOK_STYLES.filter(Boolean).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            CTA Type
          </label>
          <Select value={form.cta_type} onValueChange={(v) => setForm({ ...form, cta_type: v })}>
            <SelectTrigger className="rounded-xl border-stone-200 h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CTA_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Pillar
          </label>
          <Select value={form.pillar_id ? String(form.pillar_id) : "__none__"} onValueChange={(v) => setForm({ ...form, pillar_id: v === "__none__" ? "" : Number(v) })}>
            <SelectTrigger className="rounded-xl border-stone-200 h-10 text-sm">
              <SelectValue placeholder="No pillar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No pillar</SelectItem>
              {pillars.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Posted At
          </label>
          <Input
            type="datetime-local"
            value={form.posted_at}
            onChange={(e) => setForm({ ...form, posted_at: e.target.value })}
            className="rounded-xl border-stone-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Post URL
        </label>
        <Input
          type="url"
          value={form.post_url}
          onChange={(e) => setForm({ ...form, post_url: e.target.value })}
          className="rounded-xl border-stone-200"
          placeholder="https://linkedin.com/posts/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Topic Tags (comma separated)
        </label>
        <Input
          type="text"
          value={form.topic_tags}
          onChange={(e) => setForm({ ...form, topic_tags: e.target.value })}
          className="rounded-xl border-stone-200"
          placeholder="career, leadership, tech"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving || !form.content.trim()}
          className="rounded-xl active:scale-[0.98] transition-all"
        >
          {saving ? "Saving..." : initial ? "Update Post" : "Add Post"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl border-stone-200"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
});

PostForm.displayName = "PostForm";
export default PostForm;
