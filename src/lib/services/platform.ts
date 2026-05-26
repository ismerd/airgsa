import {
  listLinkedinSources,
  listNewsPosts,
  newsCategories,
} from "@/lib/services/intelligence-store";
import { getGsaProfileById } from "@/lib/services/gsa-profile";

export { newsCategories };
export { getGsaProfileById };

export async function getNewsPosts() {
  return listNewsPosts();
}

export async function getLinkedinSources() {
  return listLinkedinSources();
}
