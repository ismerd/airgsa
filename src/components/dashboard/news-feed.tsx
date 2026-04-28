"use client";

import { useMemo, useState } from "react";
import { NewsCard } from "@/components/dashboard/news-card";
import { Button } from "@/components/ui/button";
import { newsCategories, newsPosts } from "@/lib/services/platform";
import type { NewsCategory } from "@/lib/types";

export function NewsFeed() {
  const [active, setActive] = useState<NewsCategory | "All">("All");
  const posts = useMemo(() => {
    if (active === "All") return newsPosts;
    return newsPosts.filter((post) => post.category === active);
  }, [active]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={active === "All" ? "default" : "outline"} onClick={() => setActive("All")}>
          All
        </Button>
        {newsCategories.map((category) => (
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
      <div className="grid gap-5 xl:grid-cols-2">
        {posts.map((post) => <NewsCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
