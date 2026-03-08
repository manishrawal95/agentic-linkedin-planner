"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Zap } from "lucide-react";
import PendingIdeasReview from "./components/PendingIdeasReview";
import ActionBrief from "./components/ActionBrief";
import GrowthPulse from "./components/GrowthPulse";
import UpNext from "./components/UpNext";
import MorningBriefing from "./components/MorningBriefing";
import LinkedInAuthStatus from "./components/LinkedInAuthStatus";
import PostToday from "./components/PostToday";
import { QuickCaptureBody } from "./components/QuickCaptureBody";
import { useApi } from "@/hooks/use-api";
import type { PostIdea } from "@/types/linkedin";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "It's late-night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const Dashboard = memo(function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const { data: settingsData } = useApi<{ creator_name?: string }>("/api/linkedin/settings");
  const creatorName = settingsData?.creator_name || null;

  // Compute greeting client-side only to avoid SSR time mismatch
  useEffect(() => {
    setGreeting(getGreeting());
    setTodayDate(formatToday());
  }, []);

  const [captureIdea, setCaptureIdea] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [ideas, setIdeas] = useState<PostIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const generateWithTopic = useCallback(async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setCapturing(true);
    setCaptureError(null);
    setCaptureSuccess(false);
    try {
      const res = await fetch("/api/linkedin/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, num_variants: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Generation failed (${res.status})`);
      }
      setCaptureSuccess(true);
      setCaptureIdea("");
      setTimeout(() => setCaptureSuccess(false), 5000);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleGenerate = useCallback(() => generateWithTopic(captureIdea), [captureIdea, generateWithTopic]);

  const handleFetchIdeas = useCallback(async () => {
    if (showIdeas && ideas.length > 0) { setShowIdeas(false); return; }
    setShowIdeas(true);
    setLoadingIdeas(true);
    try {
      const body = captureIdea.trim() ? { topic_hint: captureIdea.trim() } : {};
      const res = await fetch("/api/linkedin/dashboard/post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { setIdeas((await res.json()).ideas || []); }
    } catch (err) {
      console.error("Dashboard.handleFetchIdeas: POST /api/linkedin/dashboard/post-ideas failed:", err);
    } finally {
      setLoadingIdeas(false);
    }
  }, [showIdeas, ideas.length, captureIdea]);

  const handleIdeaClick = useCallback((idea: PostIdea) => {
    setShowIdeas(false);
    generateWithTopic(idea.topic);
  }, [generateWithTopic]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Greeting header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            {greeting}{creatorName ? `, ${creatorName}` : ""}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">{todayDate}</p>
        </div>
        <LinkedInAuthStatus />
      </div>

      {/* Section 1: Morning Briefing — the hero */}
      <div className="mb-8">
        <MorningBriefing />
      </div>

      {/* Post Today — surface the best post for today */}
      <div className="mb-6">
        <PostToday />
      </div>

      {/* Section 2: Action Brief + Up Next — the cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ActionBrief />
        </div>
        <div>
          <UpNext />
        </div>
      </div>

      {/* Section 3: Growth Pulse — health check */}
      <div className="mb-8">
        <GrowthPulse />
      </div>

      {/* Section 4: Quick Capture + Pending Ideas — create zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-stone-400" />
            Quick Capture
          </h2>
          <QuickCaptureBody
            captureIdea={captureIdea}
            setCaptureIdea={(v) => { setCaptureIdea(v); setShowIdeas(false); setIdeas([]); }}
            captureError={captureError}
            captureSuccess={captureSuccess}
            capturing={capturing}
            onGenerate={handleGenerate}
            onFetchIdeas={handleFetchIdeas}
            showIdeas={showIdeas}
            loadingIdeas={loadingIdeas}
            ideas={ideas}
            onIdeaClick={handleIdeaClick}
          />
        </div>
        <PendingIdeasReview />
      </div>
    </div>
  );
});

Dashboard.displayName = "Dashboard";
export default Dashboard;
