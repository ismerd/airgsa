import {
  linkedinImportDefaults,
  listLinkedinSources,
  listNewsPosts,
  newsCategories,
} from "@/lib/services/intelligence-store";
import { getGsaProfileById } from "@/lib/services/gsa-profile";
import { listLiveTenders } from "@/lib/services/tender-workflow-store";

export { linkedinImportDefaults, newsCategories };
export { getGsaProfileById };

export async function getTenders() {
  return listLiveTenders();
}

export async function getTenderById(id: string) {
  const rows = await getTenders();
  return rows.find((tender) => tender.id === id) ?? null;
}

export async function getNewsPosts() {
  return listNewsPosts();
}

export async function getLinkedinSources() {
  return listLinkedinSources();
}
