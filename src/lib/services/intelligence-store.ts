import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { createId } from "@/lib/services/ids";
import { normalizeLinkedinPost, toNewsPostUpsert, type RawLinkedinPost } from "@/lib/services/linkedin";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { linkedinImportDefaults } from "@/lib/services/linkedin";
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

type NewsPostRow = {
  id: string;
  external_id?: string | null;
  title: string;
  source: string;
  category: NewsCategory | null;
  market: string | null;
  published_at: string | null;
  summary: string | null;
  confidence: number | string | null;
};

type LinkedinSourceRow = {
  id: string;
  name: string;
  url: string;
  category: NewsCategory | null;
  status: LinkedinSource["status"];
  last_import_at: string | null;
};

export const newsCategories: NewsCategory[] = [
  "GSA opportunity",
  "airline expansion",
  "new route",
  "cargo capacity",
  "tender/RFP",
  "partnership",
];

export { linkedinImportDefaults };

export async function listNewsPosts() {
  const supabasePosts = await listNewsPostsFromSupabase();
  if (supabasePosts) return supabasePosts;

  return sortPosts((await readStore()).posts);
}

export async function listLinkedinSources() {
  const supabaseSources = await listLinkedinSourcesFromSupabase();
  if (supabaseSources) return supabaseSources;

  return sortSources((await readStore()).sources);
}

export async function createLinkedinSource(session: SessionPayload, input: LinkedinSourceInput) {
  ensureAdmin(session);
  validateSourceInput(input);

  const supabaseSource = await createLinkedinSourceInSupabase(input);
  if (supabaseSource) return supabaseSource;

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

  const supabaseSource = await updateLinkedinSourceInSupabase(id, input);
  if (supabaseSource) return supabaseSource;

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

  const supabasePost = await updateNewsPostInSupabase(id, input);
  if (supabasePost) return supabasePost;

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

  const supabaseSaved = await upsertNewsPostsInSupabase(posts);
  if (supabaseSaved !== null) {
    await markSourceImports(posts);
    return { savedCount: supabaseSaved, stored: true };
  }

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

async function listNewsPostsFromSupabase() {
  if (!hasSupabaseAdmin()) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, external_id, title, source, category, market, published_at, summary, confidence")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return sortPosts((data ?? []).map(newsPostFromRow));
  } catch (error) {
    console.warn("[intelligence] Supabase news read failed:", (error as Error).message);
    return null;
  }
}

async function listLinkedinSourcesFromSupabase() {
  if (!hasSupabaseAdmin()) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("linkedin_sources")
      .select("id, name, url, category, status, last_import_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return sortSources((data ?? []).map(linkedinSourceFromRow));
  } catch (error) {
    console.warn("[intelligence] Supabase source read failed:", (error as Error).message);
    return null;
  }
}

async function createLinkedinSourceInSupabase(input: LinkedinSourceInput) {
  if (!hasSupabaseAdmin()) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("linkedin_sources")
    .insert({
      name: input.name.trim(),
      url: input.url.trim(),
      category: normalizeCategory(input.category),
      status: input.status ?? "active",
    })
    .select("id, name, url, category, status, last_import_at")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("LinkedIn source already exists");
    throw new Error(error.message);
  }
  return linkedinSourceFromRow(data);
}

async function updateLinkedinSourceInSupabase(id: string, input: Partial<LinkedinSourceInput>) {
  if (!hasSupabaseAdmin()) return null;
  const patch: Record<string, string | null> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.url !== undefined) patch.url = input.url.trim();
  if (input.category !== undefined) patch.category = normalizeCategory(input.category);
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("linkedin_sources")
    .update(patch)
    .eq("id", id)
    .select("id, name, url, category, status, last_import_at")
    .single();
  if (error) throw new Error(error.message);
  return linkedinSourceFromRow(data);
}

async function updateNewsPostInSupabase(id: string, input: NewsPostUpdateInput) {
  if (!hasSupabaseAdmin()) return null;
  const patch: Record<string, string | number | null> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.category !== undefined) patch.category = normalizeCategory(input.category);
  if (input.market !== undefined) patch.market = input.market.trim() || "Unclassified";
  if (input.summary !== undefined) patch.summary = input.summary.trim();
  if (input.confidence !== undefined) patch.confidence = Number(input.confidence);
  if (Object.keys(patch).length === 0) return null;

  const supabase = createSupabaseAdminClient();
  const { data: externalData, error: externalError } = await supabase
    .from("news_posts")
    .update(patch)
    .eq("external_id", id)
    .select("id, external_id, title, source, category, market, published_at, summary, confidence")
    .maybeSingle();
  if (externalError) throw new Error(externalError.message);
  if (externalData) return newsPostFromRow(externalData);

  if (isUuid(id)) {
    const fallback = await supabase
      .from("news_posts")
      .update(patch)
      .eq("id", id)
      .select("id, external_id, title, source, category, market, published_at, summary, confidence")
      .maybeSingle();
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ? newsPostFromRow(fallback.data) : null;
  }
  return null;
}

async function upsertNewsPostsInSupabase(posts: RawLinkedinPost[]) {
  if (!hasSupabaseAdmin()) return null;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("news_posts")
    .upsert(posts.map(toNewsPostUpsert), { onConflict: "external_id" });
  if (error) throw new Error(error.message);
  return posts.length;
}

async function markSourceImports(posts: RawLinkedinPost[]) {
  if (!hasSupabaseAdmin() || posts.length === 0) return;
  const urls = Array.from(new Set(posts.map((post) => post.author?.linkedinUrl).filter(Boolean))) as string[];
  if (urls.length === 0) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("linkedin_sources").update({ last_import_at: new Date().toISOString() }).in("url", urls);
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

function newsPostFromRow(row: NewsPostRow): NewsPost {
  return {
    id: row.external_id ?? row.id,
    title: row.title,
    source: row.source,
    category: normalizeCategory(row.category),
    market: row.market ?? "Unclassified",
    publishedAt: row.published_at ?? "",
    summary: row.summary ?? "",
    confidence: Number(row.confidence ?? 0),
  };
}

function linkedinSourceFromRow(row: LinkedinSourceRow): LinkedinSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    category: normalizeCategory(row.category),
    status: row.status,
    lastImport: row.last_import_at ? new Date(row.last_import_at).toISOString().slice(0, 10) : "Never",
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function hasSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
