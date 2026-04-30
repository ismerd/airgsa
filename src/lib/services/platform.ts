import {
  applications,
  gsaProfiles,
  kpiSeries,
  linkedinSources,
  linkedinImportDefaults,
  linkedinPostPreview,
  newsCategories,
  newsPosts,
  notifications,
  tenders,
} from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export {
  applications,
  gsaProfiles,
  kpiSeries,
  linkedinSources,
  linkedinImportDefaults,
  linkedinPostPreview,
  newsCategories,
  newsPosts,
  notifications,
  tenders,
};

export async function getTenders() {
  if (!isSupabaseConfigured) return tenders;
  return tenders;
}

export async function getTenderById(id: string) {
  const rows = await getTenders();
  return rows.find((tender) => tender.id === id) ?? null;
}

export async function getGsaProfileById(id: string) {
  return gsaProfiles.find((profile) => profile.id === id) ?? null;
}

export async function getNewsPosts() {
  if (!isSupabaseConfigured) return newsPosts;
  return newsPosts;
}

export async function getLinkedinSources() {
  if (!isSupabaseConfigured) return linkedinSources;
  return linkedinSources;
}
