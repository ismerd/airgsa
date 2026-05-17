import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";
import { normalizeLinkedinPost, toNewsPostUpsert, type RawLinkedinPost } from "@/lib/services/linkedin";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { linkedinImportDefaults } from "@/lib/services/linkedin";
import type { LinkedinSource, NewsCategory, NewsPost } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "intelligence.json");
const STORE_KEY = "intelligence_store";

type IntelligenceStore = {
  posts: NewsPost[];
  sources: LinkedinSource[];
};

type SourceInput = {
  name: string;
  url: string;
  category?: NewsCategory | null;
  status?: LinkedinSource["status"];
};

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

  const dbPosts = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    const store = result.rows[0] ? normalizeStore(rowData<Partial<IntelligenceStore>>(result.rows[0])) : { posts: [], sources: [] };
    return sortPosts(store.posts);
  });
  if (dbPosts) return dbPosts;

  assertFileStoreFallbackAllowed("Intelligence store");
  return sortPosts((await readFileStore()).posts);
}

export async function listLinkedinSources() {
  const supabaseSources = await listLinkedinSourcesFromSupabase();
  if (supabaseSources) return supabaseSources;

  const dbSources = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    const store = result.rows[0] ? normalizeStore(rowData<Partial<IntelligenceStore>>(result.rows[0])) : { posts: [], sources: [] };
    return sortSources(store.sources);
  });
  if (dbSources) return dbSources;

  assertFileStoreFallbackAllowed("Intelligence store");
  return sortSources((await readFileStore()).sources);
}

export async function createLinkedinSource(session: SessionPayload, input: SourceInput) {
  ensureAdmin(session);
  validateSourceInput(input);

  const supabaseSource = await createLinkedinSourceInSupabase(input);
  if (supabaseSource) return supabaseSource;

  const store = await readStore();
  if (store.sources.some((source) => source.url.toLowerCase() === input.url.trim().toLowerCase())) {
    throw new Error("LinkedIn source already exists");
  }
  const source: LinkedinSource = {
    id: `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
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

export async function updateLinkedinSource(session: SessionPayload, id: string, input: Partial<SourceInput>) {
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

async function createLinkedinSourceInSupabase(input: SourceInput) {
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

async function updateLinkedinSourceInSupabase(id: string, input: Partial<SourceInput>) {
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

async function readStore(): Promise<IntelligenceStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    return result.rows[0] ? normalizeStore(rowData<Partial<IntelligenceStore>>(result.rows[0])) : { posts: [], sources: [] };
  });
  if (dbStore) return dbStore;

  assertFileStoreFallbackAllowed("Intelligence store");
  return readFileStore();
}

async function writeStore(store: IntelligenceStore) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [STORE_KEY, JSON.stringify(normalizeStore(store))],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Intelligence store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf-8");
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

function normalizeCategory(value: NewsCategory | null | undefined) {
  if (!value) return null;
  return newsCategories.includes(value) ? value : null;
}

function validateSourceInput(input: SourceInput) {
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

function ensureAdmin(session: SessionPayload) {
  if (session.role !== "admin") throw new Error("Admin access required");
}

function hasSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
