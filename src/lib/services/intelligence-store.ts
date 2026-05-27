import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, hasPostgres, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { createId } from "@/lib/services/ids";
import { normalizeLinkedinPost, type RawLinkedinPost } from "@/lib/services/linkedin";
import type { LinkedinSource, NewsCategory, NewsPost } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "intelligence.json");
const LEGACY_STORE_KEY = "intelligence_store";

type IntelligenceStore = {
  posts: NewsPost[];
  sources: LinkedinSource[];
};

export type LinkedinSourceInput = {
  name: string;
  url: string;
  category?: NewsCategory | null;
  status?: LinkedinSource["status"];
};

export type NewsPostUpdateInput = Partial<Pick<NewsPost, "title" | "category" | "market" | "summary" | "confidence">>;

export const newsCategories: NewsCategory[] = [
  "GSA opportunity",
  "airline expansion",
  "new route",
  "cargo capacity",
  "tender/RFP",
  "partnership",
];

export async function listNewsPosts() {
  return sortPosts((await readStore()).posts);
}

export async function listLinkedinSources() {
  return sortSources((await readStore()).sources);
}

export async function createLinkedinSource(session: SessionPayload, input: LinkedinSourceInput) {
  ensureAdmin(session);
  validateSourceInput(input);

  const store = await readStore();
  if (store.sources.some((source) => source.url.toLowerCase() === input.url.trim().toLowerCase())) {
    throw new Error("LinkedIn source already exists");
  }
  const source: LinkedinSource = {
    id: createId("src"),
    name: input.name.trim(),
    url: input.url.trim(),
    category: normalizeCategory(input.category),
    status: input.status ?? "active",
    lastImport: "Never",
  };
  store.sources.unshift(source);
  await writeStore(store);
  return source;
}

export async function updateLinkedinSource(session: SessionPayload, id: string, input: Partial<LinkedinSourceInput>) {
  ensureAdmin(session);

  const store = await readStore();
  const index = store.sources.findIndex((source) => source.id === id);
  if (index < 0) return null;
  const source: LinkedinSource = {
    ...store.sources[index],
    name: input.name !== undefined ? input.name.trim() : store.sources[index].name,
    url: input.url !== undefined ? input.url.trim() : store.sources[index].url,
    category: input.category !== undefined ? normalizeCategory(input.category) : store.sources[index].category,
    status: input.status ?? store.sources[index].status,
  };
  validateSourceInput(source);
  store.sources[index] = source;
  await writeStore(store);
  return source;
}

export async function updateNewsPost(session: SessionPayload, id: string, input: NewsPostUpdateInput) {
  ensureAdmin(session);
  validateNewsPostUpdate(input);

  const store = await readStore();
  const index = store.posts.findIndex((post) => post.id === id);
  if (index < 0) return null;
  const post: NewsPost = {
    ...store.posts[index],
    title: input.title !== undefined ? input.title.trim() : store.posts[index].title,
    category: input.category !== undefined ? normalizeCategory(input.category) : store.posts[index].category,
    market: input.market !== undefined ? input.market.trim() || "Unclassified" : store.posts[index].market,
    summary: input.summary !== undefined ? input.summary.trim() : store.posts[index].summary,
    confidence: input.confidence !== undefined ? Number(input.confidence) : store.posts[index].confidence,
  };
  store.posts[index] = post;
  await writeStore(store);
  return post;
}

export async function upsertImportedLinkedinPosts(posts: RawLinkedinPost[]) {
  if (posts.length === 0) return { savedCount: 0, stored: false };

  const store = await readStore();
  const existingById = new Map(store.posts.map((post) => [post.id, post]));
  for (const post of posts) {
    const normalized = normalizeLinkedinPost(post);
    const newsPost: NewsPost = {
      id: normalized.id,
      title: normalized.content.trim().slice(0, 120) || `LinkedIn post ${normalized.id}`,
      source: normalized.authorName,
      category: null,
      market: "Unclassified",
      publishedAt: normalized.postedAt || new Date().toISOString(),
      summary: normalized.content,
      confidence: 0,
    };
    existingById.set(newsPost.id, newsPost);
  }
  store.posts = Array.from(existingById.values());
  markStoreSourceImports(store, posts);
  await writeStore(store);
  return { savedCount: posts.length, stored: true };
}

function markStoreSourceImports(store: IntelligenceStore, posts: RawLinkedinPost[]) {
  const importedAuthorUrls = new Set(posts.map((post) => normalizeLinkedinUrl(post.author?.linkedinUrl)).filter(Boolean));
  if (importedAuthorUrls.size === 0) return;
  const importedAt = new Date().toISOString();
  store.sources = store.sources.map((source) => {
    const sourceUrl = normalizeLinkedinUrl(source.url);
    return sourceUrl && importedAuthorUrls.has(sourceUrl) ? { ...source, lastImport: importedAt } : source;
  });
}

async function readStore(): Promise<IntelligenceStore> {
  const dbStore = await readStoreFromPostgres();
  if (dbStore) {
    if (dbStore.posts.length > 0 || dbStore.sources.length > 0) return dbStore;
    const legacyStore = await readLegacyStore();
    if (legacyStore.posts.length > 0 || legacyStore.sources.length > 0) {
      await writeStoreToPostgres(legacyStore);
      return legacyStore;
    }
    return dbStore;
  }

  return readLegacyStore();
}

async function writeStore(store: IntelligenceStore) {
  const saved = await writeStoreToPostgres(store);
  if (saved) return;

  assertFileStoreFallbackAllowed("Intelligence store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf-8");
}

async function readStoreFromPostgres(): Promise<IntelligenceStore | null> {
  return withPostgres(async (client) => {
    const [postsResult, sourcesResult] = await Promise.all([
      client.query("select data from public.workflow_news_posts order by published_at desc nulls last, created_at desc"),
      client.query("select data from public.workflow_linkedin_sources order by name asc"),
    ]);
    return normalizeStore({
      posts: postsResult.rows.map((row) => rowData<NewsPost>(row)),
      sources: sourcesResult.rows.map((row) => rowData<LinkedinSource>(row)),
    });
  });
}

async function readLegacyStore(): Promise<IntelligenceStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_STORE_KEY]);
    return result.rows[0] ? normalizeStore(rowData<Partial<IntelligenceStore>>(result.rows[0])) : null;
  });
  if (dbStore) return dbStore;
  if (hasPostgres()) return { posts: [], sources: [] };

  assertFileStoreFallbackAllowed("Intelligence store");
  return readFileStore();
}

async function writeStoreToPostgres(store: IntelligenceStore) {
  const normalized = normalizeStore(store);
  return withPostgresTransaction(async (client) => {
    await client.query("delete from public.workflow_news_posts");
    await client.query("delete from public.workflow_linkedin_sources");

    for (const post of normalized.posts) {
      await client.query(
        `insert into public.workflow_news_posts
          (id, title, source, category, market, published_at, summary, confidence, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          post.id,
          post.title,
          post.source,
          post.category,
          post.market,
          post.publishedAt || null,
          post.summary,
          post.confidence,
          JSON.stringify(post),
        ],
      );
    }

    for (const source of normalized.sources) {
      await client.query(
        `insert into public.workflow_linkedin_sources
          (id, name, url, category, status, last_import_at, data, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())`,
        [
          source.id,
          source.name,
          source.url,
          source.category,
          source.status,
          source.lastImport && source.lastImport !== "Never" ? source.lastImport : null,
          JSON.stringify(source),
        ],
      );
    }

    return true;
  });
}

async function readFileStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<IntelligenceStore>);
  } catch {
    return { posts: [], sources: [] };
  }
}

function normalizeStore(store: Partial<IntelligenceStore>): IntelligenceStore {
  return {
    posts: store.posts ?? [],
    sources: store.sources ?? [],
  };
}

function sortPosts(posts: NewsPost[]) {
  return [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

function sortSources(sources: LinkedinSource[]) {
  return [...sources].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLinkedinUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.search = "";
    const pathname = url.pathname
      .replace(/\/posts\/?$/i, "")
      .replace(/\/?$/, "");
    return `${url.hostname.toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/posts\/?$/i, "").replace(/\/?$/, "");
  }
}

function normalizeCategory(value: NewsCategory | null | undefined) {
  if (!value) return null;
  return newsCategories.includes(value) ? value : null;
}

function validateSourceInput(input: LinkedinSourceInput) {
  if (!input.name?.trim()) throw new Error("Source name is required");
  if (!input.url?.trim()) throw new Error("LinkedIn URL is required");
  try {
    const parsed = new URL(input.url.trim());
    if (!parsed.hostname.includes("linkedin.com")) throw new Error("URL must point to linkedin.com");
  } catch {
    throw new Error("LinkedIn URL is invalid");
  }
  if (input.status && input.status !== "active" && input.status !== "paused") throw new Error("Source status is invalid");
  if (input.category !== undefined && normalizeCategory(input.category) !== input.category) throw new Error("Source category is invalid");
}

function validateNewsPostUpdate(input: NewsPostUpdateInput) {
  if (input.title !== undefined && !input.title.trim()) throw new Error("News title is required");
  if (input.summary !== undefined && !input.summary.trim()) throw new Error("News summary is required");
  if (input.category !== undefined && normalizeCategory(input.category) !== input.category) throw new Error("News category is invalid");
  if (input.confidence !== undefined) {
    const confidence = Number(input.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) throw new Error("Confidence must be between 0 and 100");
  }
}

function ensureAdmin(session: SessionPayload) {
  if (session.role !== "admin") throw new Error("Admin access required");
}
