"use client";

import { useMemo, useState } from "react";
import { NewsCard } from "@/components/dashboard/news-card";
import { Button } from "@/components/ui/button";
import type { NewsCategory, NewsPost } from "@/lib/types";

export function NewsFeed({ categories, posts: allPosts }: { categories: NewsCategory[]; posts: NewsPost[] }) {
  const [active, setActive] = useState<NewsCategory | "All">("All");
  const posts = useMemo(() => {
    if (active === "All") return allPosts;
    return allPosts.filter((post) => post.category === active);
  }, [active, allPosts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={active === "All" ? "default" : "outline"} onClick={() => setActive("All")}>
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            size="sm"
            variant={active === category ? "default" : "outline"}
            onClick={() => setActive(category)}
          >
            {category}
          </Button>
        ))}
      </div>
      {posts.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {posts.map((post) => <NewsCard key={post.id} post={post} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border-ui bg-surface p-6 text-sm text-ink-muted">
          No imported cargo intelligence posts yet. Add LinkedIn sources and run an import from the admin console.
        </div>
      )}
    </div>
  );
}
