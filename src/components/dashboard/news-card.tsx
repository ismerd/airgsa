import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { NewsPost } from "@/lib/types";

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{post.category ?? "unclassified"}</Badge>
          <span className="text-xs text-slate-500">{post.market}</span>
          <span className="text-xs text-slate-500">{post.publishedAt}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">{post.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{post.summary}</p>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>{post.source}</span>
          <span>{post.confidence}% signal confidence</span>
        </div>
      </CardContent>
    </Card>
  );
}
