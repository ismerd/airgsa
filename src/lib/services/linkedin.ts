import type {
  LinkedinImportPostedLimit,
  LinkedinImportRequest,
  LinkedinImportScheduleUnit,
  LinkedinMediaItem,
  LinkedinPostPreview,
} from "@/lib/types";

export const LINKEDIN_TARGET_URLS_PER_REQUEST = 6;

export const linkedinImportDefaults: LinkedinImportRequest = {
  includeQuotePosts: false,
  includeReposts: false,
  maxComments: 0,
  maxPosts: 50,
  maxReactions: 0,
  postNestedComments: false,
  postNestedReactions: false,
  postedLimit: "24h",
  scrapeComments: false,
  scrapeReactions: false,
  targetUrls: [],
};

export const POSTED_LIMIT_OPTIONS: { value: LinkedinImportPostedLimit; label: string }[] = [
  { value: "1h",      label: "Last 1 hour" },
  { value: "24h",     label: "Last 24 hours" },
  { value: "week",    label: "Last week" },
  { value: "month",   label: "Last month" },
  { value: "3months", label: "Last 3 months" },
  { value: "6months", label: "Last 6 months" },
  { value: "year",    label: "Last year" },
  { value: "any",     label: "All time" },
];

export type RawLinkedinPost = {
  id: string;
  linkedinUrl: string;
  content?: string;
  author?: {
    name?: string;
    linkedinUrl?: string;
  };
  postedAt?: {
    timestamp?: number;
    date?: string;
  };
  postImages?: Array<{
    url?: string;
    width?: number;
    height?: number;
  }>;
  document?: {
    title?: string;
    transcribedDocumentUrl?: string;
    coverPages?: Array<{
      width?: number;
      height?: number;
      imageUrls?: string[];
    }>;
  };
};

export function buildLinkedinImportRequest(input: Partial<LinkedinImportRequest>): LinkedinImportRequest {
  return {
    includeQuotePosts: input.includeQuotePosts ?? false,
    includeReposts: input.includeReposts ?? false,
    maxComments: 0,
    maxPosts: input.maxPosts ?? 50,
    maxReactions: 0,
    postNestedComments: false,
    postNestedReactions: false,
    postedLimit: input.postedLimit ?? "any",
    scrapeComments: false,
    scrapeReactions: false,
    targetUrls: input.targetUrls ?? [],
  };
}

export function buildLinkedinImportBatches(
  input: Partial<LinkedinImportRequest>,
  batchSize = LINKEDIN_TARGET_URLS_PER_REQUEST,
): LinkedinImportRequest[] {
  const targetUrls = input.targetUrls ?? [];
  const chunks = chunk(targetUrls, batchSize);

  if (chunks.length === 0) {
    return [buildLinkedinImportRequest({ ...input, targetUrls: [] })];
  }

  return chunks.map((targetUrlChunk) => buildLinkedinImportRequest({ ...input, targetUrls: targetUrlChunk }));
}

export function getScheduleLabel(value: number, unit: LinkedinImportScheduleUnit) {
  return `every ${value} ${value === 1 ? unit.slice(0, -1) : unit}`;
}

export function getPostedLimitLabel(value: LinkedinImportPostedLimit): string {
  return POSTED_LIMIT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function normalizeLinkedinPost(raw: RawLinkedinPost): LinkedinPostPreview {
  const media: LinkedinMediaItem[] = [
    ...(raw.postImages ?? [])
      .filter((image) => image.url)
      .map((image) => ({
        type: "image" as const,
        url: image.url!,
        width: image.width,
        height: image.height,
      })),
  ];

  if (raw.document?.transcribedDocumentUrl) {
    media.push({
      type: "document",
      title: raw.document.title?.trim(),
      url: raw.document.transcribedDocumentUrl,
    });
  }

  raw.document?.coverPages?.forEach((page, pageIndex) => {
    page.imageUrls?.forEach((url, imageIndex) => {
      media.push({
        type: "image",
        title: `Document cover ${pageIndex + 1}.${imageIndex + 1}`,
        url,
        width: page.width,
        height: page.height,
      });
    });
  });

  return {
    id: raw.id,
    linkedinUrl: raw.linkedinUrl,
    authorName: raw.author?.name ?? "Unknown LinkedIn author",
    authorUrl: raw.author?.linkedinUrl ?? "",
    content: raw.content ?? "",
    postedAt: raw.postedAt?.date ?? "",
    media,
  };
}

export function extractLinkedinPostsFromResponse(payload: unknown): RawLinkedinPost[] {
  if (Array.isArray(payload)) return payload.filter(isRawLinkedinPost);

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.data, record.items, record.results, record.posts, record.output];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate.filter(isRawLinkedinPost);
    }
  }

  return [];
}

export function isPostInsideLookback(
  post: RawLinkedinPost,
  postedLimit: LinkedinImportPostedLimit,
  now = Date.now(),
) {
  if (postedLimit === "any") return true;

  const postedAt = post.postedAt?.timestamp ?? Date.parse(post.postedAt?.date ?? "");
  if (!Number.isFinite(postedAt)) return true;

  const ms: Record<LinkedinImportPostedLimit, number> = {
    "1h":      1 * 60 * 60 * 1000,
    "24h":     24 * 60 * 60 * 1000,
    "week":    7 * 24 * 60 * 60 * 1000,
    "month":   30 * 24 * 60 * 60 * 1000,
    "3months": 90 * 24 * 60 * 60 * 1000,
    "6months": 180 * 24 * 60 * 60 * 1000,
    "year":    365 * 24 * 60 * 60 * 1000,
    "any":     Infinity,
  };

  return postedAt >= now - ms[postedLimit];
}

export function toNewsPostUpsert(post: RawLinkedinPost) {
  const normalized = normalizeLinkedinPost(post);
  const title = normalized.content.trim().slice(0, 120) || `LinkedIn post ${normalized.id}`;

  return {
    external_id: normalized.id,
    title,
    source: normalized.authorName,
    source_url: normalized.linkedinUrl,
    author_name: normalized.authorName,
    author_url: normalized.authorUrl,
    category: null,
    market: null,
    published_at: normalized.postedAt || null,
    summary: normalized.content,
    confidence: 0,
    media: normalized.media,
    raw_payload: post,
  };
}

function isRawLinkedinPost(value: unknown): value is RawLinkedinPost {
  return Boolean(value && typeof value === "object" && "id" in value && "linkedinUrl" in value);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
