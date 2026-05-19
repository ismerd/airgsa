"use client";

import type React from "react";
import { useState } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NewsCategory, NewsPost } from "@/lib/types";

type EditablePost = Pick<NewsPost, "title" | "category" | "market" | "summary" | "confidence">;

export function AdminNewsPostManager({
  categories,
  initialPosts,
}: {
  categories: NewsCategory[];
  initialPosts: NewsPost[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unclassifiedCount = posts.filter((post) => !post.category || post.confidence < 50).length;

  async function savePost(post: NewsPost, patch: EditablePost) {
    setSavingId(post.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/news-posts/${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "News post could not be updated");
      setPosts((current) => current.map((item) => item.id === post.id ? payload.post : item));
      setMessage("News post updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>News review queue</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Classify imported LinkedIn posts before relying on them as cargo intelligence.
            </p>
          </div>
          <Badge variant={unclassifiedCount > 0 ? "warning" : "success"}>{unclassifiedCount} need review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}
        {message && <div className="rounded-md border border-success/25 bg-success-bg p-3 text-sm text-success">{message}</div>}

        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.slice(0, 12).map((post) => (
              <NewsPostEditor
                key={post.id}
                post={post}
                categories={categories}
                saving={savingId === post.id}
                onSave={savePost}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
            No imported news posts yet. Add active LinkedIn sources and run an import first.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewsPostEditor({
  post,
  categories,
  saving,
  onSave,
}: {
  post: NewsPost;
  categories: NewsCategory[];
  saving: boolean;
  onSave: (post: NewsPost, patch: EditablePost) => void;
}) {
  const [draft, setDraft] = useState<EditablePost>({
    title: post.title,
    category: post.category,
    market: post.market,
    summary: post.summary,
    confidence: post.confidence,
  });

  return (
    <div className="rounded-lg border border-border-ui bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={draft.category ? "success" : "warning"}>{draft.category ?? "unclassified"}</Badge>
        <span className="text-xs text-ink-muted">{post.source}</span>
        <span className="text-xs text-ink-muted">{post.publishedAt || "date unknown"}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_.7fr_.45fr]">
        <Field label="Title">
          <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Category">
          <Select value={draft.category ?? ""} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value ? event.target.value as NewsCategory : null }))}>
            <option value="">Unclassified</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
        </Field>
        <Field label="Confidence">
          <Input
            type="number"
            min={0}
            max={100}
            value={draft.confidence}
            onChange={(event) => setDraft((current) => ({ ...current, confidence: Number(event.target.value) }))}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[.5fr_1fr]">
        <Field label="Market">
          <Input value={draft.market} onChange={(event) => setDraft((current) => ({ ...current, market: event.target.value }))} />
        </Field>
        <Field label="Summary">
          <Textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
        </Field>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={saving || !draft.title.trim() || !draft.summary.trim()} onClick={() => onSave(post, draft)}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save review"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
