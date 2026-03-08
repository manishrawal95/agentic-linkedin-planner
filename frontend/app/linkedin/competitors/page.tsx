"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Users, ExternalLink, Edit2 } from "lucide-react";
import type { Competitor } from "@/types/linkedin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CompetitorsPage = memo(function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    linkedin_url: "",
    niche: "",
    notes: "",
  });

  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/competitors");
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      linkedin_url: form.linkedin_url || null,
      niche: form.niche || null,
      notes: form.notes || null,
    };

    if (editId) {
      await fetch(`/api/linkedin/competitors/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/linkedin/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditId(null);
    setForm({ name: "", linkedin_url: "", niche: "", notes: "" });
    fetchCompetitors();
  };

  const handleEdit = (comp: Competitor) => {
    setForm({
      name: comp.name,
      linkedin_url: comp.linkedin_url || "",
      niche: comp.niche || "",
      notes: comp.notes || "",
    });
    setEditId(comp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/linkedin/competitors/${id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchCompetitors();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-40 skeleton rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Competitors
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({ name: "", linkedin_url: "", niche: "", notes: "" });
          }}
        >
          <Plus className="w-4 h-4" />
          Add Competitor
        </Button>
      </div>

      {/* Add/Edit Competitor Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Competitor" : "Add Competitor"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update the details for this competitor."
                : "Track a new competitor to analyze their content strategy."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Name
                </label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Competitor name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Niche
                </label>
                <Input
                  type="text"
                  value={form.niche}
                  onChange={(e) => setForm({ ...form, niche: e.target.value })}
                  placeholder="e.g., Tech Leadership"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                LinkedIn URL
              </label>
              <Input
                type="url"
                value={form.linkedin_url}
                onChange={(e) =>
                  setForm({ ...form, linkedin_url: e.target.value })
                }
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Notes
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="What makes them stand out? What can you learn?"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editId ? "Update" : "Add Competitor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete competitor</DialogTitle>
            <DialogDescription>
              This will permanently remove this competitor and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget !== null) {
                  handleDelete(deleteTarget);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {competitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/60">
          <EmptyState
            icon={Users}
            title="No competitors tracked yet"
            description="Add competitors to analyze their content strategy"
            action={{ label: "Add Competitor", onClick: () => setShowForm(true) }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="bg-white rounded-2xl border border-stone-200/60 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">{comp.name}</h3>
                  {comp.niche && (
                    <Badge
                      variant="secondary"
                      className="mt-1 bg-stone-100 text-stone-700"
                    >
                      {comp.niche}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {comp.linkedin_url && (
                    <a
                      href={comp.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleEdit(comp)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(comp.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {comp.notes && (
                <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                  {comp.notes}
                </p>
              )}

              <div className="flex gap-4 mt-4 pt-3 border-t border-stone-200/60">
                <div className="text-center">
                  <p className="text-lg font-semibold text-stone-900">
                    {comp.post_count}
                  </p>
                  <p className="text-[11px] text-stone-600 uppercase">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-stone-900">
                    {comp.avg_impressions
                      ? Math.round(comp.avg_impressions).toLocaleString()
                      : "-"}
                  </p>
                  <p className="text-[11px] text-stone-600 uppercase">Avg Imp</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-stone-700">
                    {comp.avg_engagement_score
                      ? `${(comp.avg_engagement_score * 100).toFixed(1)}%`
                      : "-"}
                  </p>
                  <p className="text-[11px] text-stone-600 uppercase">Avg Eng</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

CompetitorsPage.displayName = "CompetitorsPage";
export default CompetitorsPage;
