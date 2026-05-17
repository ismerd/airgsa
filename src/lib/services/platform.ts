import {
  airlineCampaigns,
  applications,
  gsaCampaigns,
  gsaProfiles,
  kpiSeries,
  notifications,
  tenders,
} from "@/lib/mock-data";
import {
  linkedinImportDefaults,
  listLinkedinSources,
  listNewsPosts,
  newsCategories,
} from "@/lib/services/intelligence-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export {
  airlineCampaigns,
  applications,
  gsaCampaigns,
  gsaProfiles,
  kpiSeries,
  linkedinImportDefaults,
  newsCategories,
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
  return listNewsPosts();
}

export async function getLinkedinSources() {
  return listLinkedinSources();
}
