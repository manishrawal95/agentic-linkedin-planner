"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Cpu,
  Clock,
  Target,
  User,
  Save,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ui/error-card";
import { toast } from "sonner";

interface AppSettings {
  llm_provider: string;
  llm_temperature: string;
  gemini_model: string;
  claude_model: string;
  creator_name: string;
  posting_goal_per_week: string;
  default_post_time: string;
  active_provider: string;
  has_gemini_key: boolean;
  has_anthropic_key: boolean;
}

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Gemini", description: "Google — free tier available" },
  { value: "claude", label: "Claude", description: "Anthropic — higher quality" },
] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Local editable state
  const [provider, setProvider] = useState("");
  const [temperature, setTemperature] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [claudeModel, setClaudeModel] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [postingGoal, setPostingGoal] = useState("");
  const [defaultTime, setDefaultTime] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/settings");
      if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
      const data: AppSettings = await res.json();
      setSettings(data);
      setProvider(data.llm_provider);
      setTemperature(data.llm_temperature);
      setGeminiModel(data.gemini_model);
      setClaudeModel(data.claude_model);
      setCreatorName(data.creator_name);
      setPostingGoal(data.posting_goal_per_week);
      setDefaultTime(data.default_post_time);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = useCallback(
    <T extends string>(setter: (v: T) => void) =>
      (value: T) => {
        setter(value);
        setDirty(true);
      },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/linkedin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_provider: provider,
          llm_temperature: temperature,
          gemini_model: geminiModel,
          claude_model: claudeModel,
          creator_name: creatorName,
          posting_goal_per_week: postingGoal,
          default_post_time: defaultTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Save failed (${res.status})`);
      }
      toast.success("Settings saved");
      setDirty(false);
      await fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [provider, temperature, geminiModel, claudeModel, creatorName, postingGoal, defaultTime, fetchSettings]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-32 skeleton rounded-lg" />
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Settings</h1>
        <ErrorCard message={error} onRetry={fetchSettings} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Settings</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Configure AI provider, models, and content preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-xl gap-1.5 active:scale-[0.98] transition-all shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* AI Provider */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-stone-100">
            <Cpu className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">AI Provider</h2>
            <p className="text-xs text-stone-500">Choose which LLM powers ideation, drafts, and analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDER_OPTIONS.map((opt) => {
            const isActive = provider === opt.value;
            const hasKey =
              opt.value === "gemini" ? settings?.has_gemini_key : settings?.has_anthropic_key;
            return (
              <button
                key={opt.value}
                onClick={() => handleChange(setProvider)(opt.value)}
                disabled={!hasKey}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-stone-800 bg-stone-50"
                    : hasKey
                      ? "border-stone-200/60 hover:border-stone-300 bg-white"
                      : "border-stone-200/60 bg-stone-50 opacity-50 cursor-not-allowed"
                }`}
              >
                {isActive && (
                  <CheckCircle2 className="w-4 h-4 text-stone-800 absolute top-3 right-3" />
                )}
                <p className="text-sm font-semibold text-stone-900">{opt.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{opt.description}</p>
                {!hasKey && (
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-amber-50 text-amber-700 border-amber-200/60">
                    No API key configured
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model & Temperature */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-stone-100">
            <Settings className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Model Configuration</h2>
            <p className="text-xs text-stone-500">Model names and creativity temperature</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Gemini Model</label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => handleChange(setGeminiModel)(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Claude Model</label>
              <input
                type="text"
                value={claudeModel}
                onChange={(e) => handleChange(setClaudeModel)(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Temperature — {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => handleChange(setTemperature)(e.target.value)}
              className="w-full accent-stone-800"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Precise (0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Preferences */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-stone-100">
            <Target className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Content Preferences</h2>
            <p className="text-xs text-stone-500">Posting cadence and scheduling defaults</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />
              Display Name
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => handleChange(setCreatorName)(e.target.value)}
              placeholder="Manish"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
            />
            <p className="text-[10px] text-stone-400 mt-1">Used in the dashboard greeting</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              <Target className="w-3 h-3 inline mr-1" />
              Posts Per Week Goal
            </label>
            <input
              type="number"
              min="1"
              max="14"
              value={postingGoal}
              onChange={(e) => handleChange(setPostingGoal)(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />
              Default Post Time
            </label>
            <input
              type="time"
              value={defaultTime}
              onChange={(e) => handleChange(setDefaultTime)(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
            />
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-5">
        <p className="text-xs font-medium text-stone-600 mb-2">System Info</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-stone-500">
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">Active Provider</p>
            <p className="font-medium text-stone-700 mt-0.5">{settings?.active_provider}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">Gemini Key</p>
            <p className={`font-medium mt-0.5 ${settings?.has_gemini_key ? "text-green-600" : "text-stone-400"}`}>
              {settings?.has_gemini_key ? "Configured" : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">Anthropic Key</p>
            <p className={`font-medium mt-0.5 ${settings?.has_anthropic_key ? "text-green-600" : "text-stone-400"}`}>
              {settings?.has_anthropic_key ? "Configured" : "Not set"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
