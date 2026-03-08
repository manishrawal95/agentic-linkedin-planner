"use client";

import { memo, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Filter, FileText, Search, ArrowUpDown, BarChart3, Upload, ChevronDown } from "lucide-react";
import PostForm from "../components/PostForm";
import PostCard from "../components/PostCard";
import MetricsForm from "../components/MetricsForm";
import { useToast } from "../components/Toast";
import { useBackgroundTask } from "@/hooks/use-background-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Post, Pillar, Metrics } from "@/types/linkedin";

const PostsPage = memo(function PostsPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, Metrics>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [metricsPostId, setMetricsPostId] = useState<number | null>(null);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [metricsPostAuthor, setMetricsPostAuthor] = useState<string>("me");
  const [filterAuthor, setFilterAuthor] = useState<string>("");
  const [filterPillar, setFilterPillar] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterClassification, setFilterClassification] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterAuthor && filterAuthor !== "__others__") params.set("author", filterAuthor);
    if (filterPillar) params.set("pillar_id", filterPillar);
    const res = await fetch(`/api/linkedin/posts?${params}`);
    const data = await res.json();
    let postsList = data.posts || [];
    if (filterAuthor === "__others__") {
      postsList = postsList.filter((p: Post) => p.author !== "me");
    }
    setPosts(postsList);

    if (postsList.length > 0) {
      try {
        const ids = postsList.map((p: Post) => p.id).join(",");
        const mRes = await fetch(`/api/linkedin/posts/batch-metrics?post_ids=${ids}`);
        const mData = await mRes.json();
        const metrics: Record<number, Metrics> = {};
        for (const [postId, m] of Object.entries(mData.metrics || {})) {
          metrics[Number(postId)] = m as Metrics;
        }
        setMetricsMap(metrics);
      } catch (err) {
        console.error("PostsPage.fetchPosts: batch-metrics fetch failed:", err);
        setMetricsMap({});
      }
    }
  }, [filterAuthor, filterPillar]);

  const fetchPillars = useCallback(async () => {
    const res = await fetch("/api/linkedin/pillars");
    const data = await res.json();
    setPillars(data.pillars || []);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchPillars();
  }, [fetchPosts, fetchPillars]);

  const { running: analyzing, launch: launchAnalyze } = useBackgroundTask({
    key: "post_analyze",
    onDone: () => fetchPosts(),
    successMessage: "Post analysis complete",
  });

  const { running: batchAnalyzing, launch: launchBatchAnalyze } = useBackgroundTask({
    key: "batch_analyze",
    onDone: () => fetchPosts(),
    successMessage: "Batch analysis complete",
  });

  const handleCreatePost = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/linkedin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to save post. Please try again.");
      throw new Error("Failed to create post");
    }
    setShowForm(false);
    fetchPosts();
  };

  const handleEditPost = (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setEditingPost(post);
      setShowForm(false);
    }
  };

  const handleUpdatePost = async (data: Record<string, unknown>) => {
    if (!editingPost) return;
    const res = await fetch(`/api/linkedin/posts/${editingPost.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to update post. Please try again.");
      throw new Error("Failed to update post");
    }
    setEditingPost(null);
    fetchPosts();
  };

  const handleAddMetrics = async (
    postId: number,
    data: Record<string, number>
  ) => {
    const res = await fetch(`/api/linkedin/posts/${postId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to save metrics. Please try again.");
      return;
    }
    setMetricsPostId(null);
    fetchPosts();
    toast.success("Metrics saved — AI analysis running in background.");
  };

  const handleAnalyze = useCallback((postId: number) => {
    launchAnalyze(
      `/api/linkedin/analyze/${postId}`,
      { method: "POST" },
      "Analyzing post — you can navigate away safely"
    );
  }, [launchAnalyze]);

  const handleBatchAnalyze = useCallback(() => {
    if (posts.length === 0) return;
    launchBatchAnalyze(
      "/api/linkedin/analyze/batch?force=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posts.map((p) => p.id)),
      },
      `Analyzing ${posts.length} posts — you can navigate away safely`
    );
  }, [posts, launchBatchAnalyze]);

  const handleImportMetrics = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    const allowedTypes = [".csv", ".xlsx", ".xls"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Please upload a .csv or .xlsx file.`);
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/linkedin/posts/import-metrics", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        toast.error(`Import failed: ${detail}`);
        return;
      }

      const data = await res.json();
      const sheets = (data.sheets_processed as string[]) ?? [];
      const topPosts = data.top_posts as { matched?: number; created?: number; total_posts?: number } | undefined;
      const engagement = data.engagement as { days?: number } | undefined;
      const followers = data.followers as { total_followers?: number; days?: number } | undefined;
      const demographics = data.demographics as { entries?: number } | undefined;

      const parts: string[] = [];
      if (topPosts?.total_posts) {
        parts.push(`${topPosts.total_posts} posts (${topPosts.matched ?? 0} matched, ${topPosts.created ?? 0} new)`);
      }
      if (engagement?.days) parts.push(`${engagement.days} days of engagement`);
      if (followers?.total_followers) parts.push(`${followers.total_followers} followers`);
      if (demographics?.entries) parts.push(`${demographics.entries} demographics`);

      if (parts.length > 0) {
        toast.success(`Imported: ${parts.join(", ")}`);
        fetchPosts();
      } else if (sheets.length === 0) {
        toast.error("No recognized sheets found. Upload a LinkedIn Creator Analytics .xlsx export.");
      } else {
        toast.success(`Import complete: ${sheets.length} sheets processed`);
        fetchPosts();
      }
    } catch (err) {
      console.error("PostsPage.handleImportMetrics: POST /api/linkedin/posts/import-metrics failed:", err);
      toast.error("Failed to import metrics. Is the backend running?");
    } finally {
      setImporting(false);
    }
  }, [toast, fetchPosts]);

  const handleDelete = (postId: number) => {
    setDeletePostId(postId);
  };

  const confirmDelete = async () => {
    if (deletePostId === null) return;
    try {
      const res = await fetch(`/api/linkedin/posts/${deletePostId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete post. Please try again.");
        return;
      }
      fetchPosts();
    } catch (err) {
      console.error("PostsPage.confirmDelete: DELETE /api/linkedin/posts/:id failed:", err);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setDeletePostId(null);
    }
  };

  const pillarMap = Object.fromEntries(pillars.map((p) => [p.id, p]));

  const filteredPosts = posts
    .filter((post) => {
      if (filterType && post.post_type !== filterType) return false;
      if (filterClassification && post.classification !== filterClassification) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const tags = (() => { try { return JSON.parse(post.topic_tags || "[]"); } catch { return []; } })();
        const matchesContent = post.content.toLowerCase().includes(q);
        const matchesTags = tags.some((t: string) => t.toLowerCase().includes(q));
        const matchesHook = post.hook_line?.toLowerCase().includes(q);
        if (!matchesContent && !matchesTags && !matchesHook) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return (b.posted_at || "").localeCompare(a.posted_at || "");
      if (sortBy === "engagement") return (metricsMap[b.id]?.engagement_score || 0) - (metricsMap[a.id]?.engagement_score || 0);
      if (sortBy === "impressions") return (metricsMap[b.id]?.impressions || 0) - (metricsMap[a.id]?.impressions || 0);
      if (sortBy === "comments") return (metricsMap[b.id]?.comments || 0) - (metricsMap[a.id]?.comments || 0);
      if (sortBy === "saves") return (metricsMap[b.id]?.saves || 0) - (metricsMap[a.id]?.saves || 0);
      return 0;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Post Library</h1>
          <p className="text-sm text-stone-500 mt-1">
            {filteredPosts.length} of {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportMetrics}
            className="hidden"
            aria-label="Import metrics file"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="gap-2 rounded-xl border-stone-200"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Metrics</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleBatchAnalyze}
            disabled={batchAnalyzing || posts.length === 0}
            className="gap-2 rounded-xl border-stone-200"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analyze All</span>
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" />
            Add Post
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-stone-200/60 px-4 py-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts by content, tags, or hook..."
              className="pl-10 rounded-xl border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={`gap-1.5 rounded-xl border-stone-200 h-9 shrink-0 ${
              (filterAuthor || filterPillar || filterType || filterClassification)
                ? "bg-stone-900 text-white border-stone-900 hover:bg-stone-800 hover:text-white"
                : ""
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(() => {
              const count = [filterAuthor, filterPillar, filterType, filterClassification].filter(Boolean).length;
              return count > 0 ? (
                <span className="bg-white/20 text-[11px] font-semibold rounded-full px-1.5 py-0.5 leading-none">{count}</span>
              ) : null;
            })()}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>
        {showFilters && (
        <div className="flex gap-3 items-center flex-wrap pt-1">
          <Select value={filterAuthor || "__all__"} onValueChange={(v) => setFilterAuthor(v === "__all__" ? "" : v)}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] rounded-xl border-stone-200 h-9 text-sm">
              <SelectValue placeholder="All authors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All authors</SelectItem>
              <SelectItem value="me">My posts</SelectItem>
              <SelectItem value="__others__">Others&apos; posts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPillar || "__all__"} onValueChange={(v) => setFilterPillar(v === "__all__" ? "" : v)}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] rounded-xl border-stone-200 h-9 text-sm">
              <SelectValue placeholder="All pillars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All pillars</SelectItem>
              {pillars.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterType || "__all__"} onValueChange={(v) => setFilterType(v === "__all__" ? "" : v)}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] rounded-xl border-stone-200 h-9 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="carousel">Carousel</SelectItem>
              <SelectItem value="personal image">Personal Image</SelectItem>
              <SelectItem value="social proof image">Social Proof Image</SelectItem>
              <SelectItem value="poll">Poll</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="article">Article</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClassification || "__all__"} onValueChange={(v) => setFilterClassification(v === "__all__" ? "" : v)}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px] rounded-xl border-stone-200 h-9 text-sm">
              <SelectValue placeholder="All results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All results</SelectItem>
              <SelectItem value="hit">Hit</SelectItem>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="miss">Miss</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-stone-400 shrink-0" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[170px] rounded-xl border-stone-200 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="engagement">Sort by Engagement</SelectItem>
                <SelectItem value="impressions">Sort by Impressions</SelectItem>
                <SelectItem value="comments">Sort by Comments</SelectItem>
                <SelectItem value="saves">Sort by Saves</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        )}
      </div>

      {showForm && <PostForm pillars={pillars} onSubmit={handleCreatePost} onCancel={() => setShowForm(false)} />}

      {/* Post List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/60">
            <EmptyState
              icon={FileText}
              title={searchQuery || filterType || filterClassification ? "No matching posts" : "No posts yet"}
              description={
                searchQuery || filterType || filterClassification
                  ? "Try adjusting your filters or search query"
                  : "Log your LinkedIn posts to start tracking performance and getting AI insights"
              }
              action={
                !searchQuery && !filterType && !filterClassification
                  ? { label: "Add Post", onClick: () => setShowForm(true) }
                  : undefined
              }
            />
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id}>
              {editingPost?.id === post.id ? (
                <PostForm
                  pillars={pillars}
                  onSubmit={handleUpdatePost}
                  onCancel={() => setEditingPost(null)}
                  initial={{
                    author: editingPost.author,
                    content: editingPost.content,
                    post_url: editingPost.post_url || "",
                    post_type: editingPost.post_type,
                    cta_type: editingPost.cta_type,
                    hook_line: editingPost.hook_line || "",
                    hook_style: editingPost.hook_style || "",
                    posted_at: editingPost.posted_at || "",
                    pillar_id: editingPost.pillar_id,
                    topic_tags: (() => { try { return JSON.parse(editingPost.topic_tags || "[]").join(", "); } catch { return ""; } })(),
                  }}
                />
              ) : (
                <>
                  <div className="relative group/link">
                    <Link href={`/linkedin/posts/${post.id}`} className="absolute inset-0 z-0" aria-label={`View post #${post.id} details`} />
                    <div className="relative z-10 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
                      <PostCard
                        post={post}
                        pillarName={post.pillar_id ? pillarMap[post.pillar_id]?.name : undefined}
                        pillarColor={post.pillar_id ? pillarMap[post.pillar_id]?.color : undefined}
                        latestMetrics={metricsMap[post.id] || null}
                        onAddMetrics={(id) => { setMetricsPostId(id); setMetricsPostAuthor(post.author); }}
                        onAnalyze={handleAnalyze}
                        onEdit={handleEditPost}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                  {metricsPostId === post.id && (
                    <MetricsForm postId={metricsPostId} author={metricsPostAuthor} initialMetrics={metricsMap[post.id] ?? undefined} onSubmit={handleAddMetrics} onCancel={() => setMetricsPostId(null)} />
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {(analyzing || batchAnalyzing || importing) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-stone-900 text-white rounded-xl px-5 py-3 flex items-center gap-3 shadow-2xl">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            <span className="text-sm font-medium">
              {importing
                ? "Importing metrics..."
                : batchAnalyzing
                  ? `Analyzing ${posts.length} posts with AI...`
                  : "Analyzing post..."}
            </span>
          </div>
        </div>
      )}
      <AlertDialog open={deletePostId !== null} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the post and its metrics. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

PostsPage.displayName = "PostsPage";
export default PostsPage;
