import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import {
  buildLinkedinImportBatches,
  extractLinkedinPostsFromResponse,
  isPostInsideLookback,
  normalizeLinkedinPost,
  type RawLinkedinPost,
} from "@/lib/services/linkedin";
import { upsertImportedLinkedinPosts } from "@/lib/services/intelligence-store";
import type { LinkedinImportPostedLimit } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const APIFY_ACTOR_ID = "WI0tj4Ieb5Kq458gB";

type ImportRequest = {
  token?: string;
  targetUrls?: string[];
  postedLimit?: LinkedinImportPostedLimit;
  includeQuotePosts?: boolean;
  includeReposts?: boolean;
  maxPosts?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ImportRequest;
  const token = body.token || process.env.LINKEDIN_API_TOKEN;
  const targetUrls = body.targetUrls?.filter(Boolean) ?? [];
  const postedLimit = body.postedLimit ?? "24h";

  if (!token) {
    return NextResponse.json(
      { error: "LinkedIn access token is missing. Add it in the form or set LINKEDIN_API_TOKEN." },
      { status: 400 },
    );
  }

  if (targetUrls.length === 0) {
    return NextResponse.json({ error: "Add at least one LinkedIn page to watch." }, { status: 400 });
  }

  const client = new ApifyClient({ token });

  const batches = buildLinkedinImportBatches({
    includeQuotePosts: body.includeQuotePosts ?? false,
    includeReposts: body.includeReposts ?? false,
    maxPosts: body.maxPosts ?? 50,
    postedLimit,
    targetUrls,
  });

  const rawPosts: RawLinkedinPost[] = [];

  for (const batch of batches) {
    let run: Awaited<ReturnType<ReturnType<ApifyClient["actor"]>["call"]>>;
    try {
      run = await client.actor(APIFY_ACTOR_ID).call(batch);
    } catch (err) {
      return NextResponse.json(
        { error: `Apify actor failed to start. Check your token. (${err instanceof Error ? err.message : String(err)})` },
        { status: 502 },
      );
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    rawPosts.push(...extractLinkedinPostsFromResponse(items));
  }

  const seen = new Set<string>();
  const filteredPosts = rawPosts
    .filter((post) => isPostInsideLookback(post, postedLimit))
    .filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });

  const storage = await upsertImportedLinkedinPosts(filteredPosts);

  return NextResponse.json({
    importedCount: filteredPosts.length,
    savedCount: storage.savedCount,
    stored: storage.stored,
    posts: filteredPosts.map(normalizeLinkedinPost),
  });
}
