import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { listNewsPosts } from "@/lib/services/intelligence-store";
import { listLivePartnerContracts, type LivePartnerContract } from "@/lib/services/tender-workflow-store";
import type { NewsPost } from "@/lib/types";

type ContextualNewsSignal = {
  post: NewsPost;
  relevanceScore: number;
  matchedTerms: string[];
  matchedContracts: Array<{
    id: string;
    gsaName: string;
    market: string;
    assignedRouteCount: number;
  }>;
};

export type ContextualIntelligenceSnapshot = {
  contracts: LivePartnerContract[];
  marketTerms: string[];
  routeTerms: string[];
  signals: ContextualNewsSignal[];
  unclassifiedCount: number;
  highConfidenceCount: number;
};

export async function getContextualIntelligence(session: SessionPayload): Promise<ContextualIntelligenceSnapshot> {
  const [posts, contracts] = await Promise.all([listNewsPosts(), listLivePartnerContracts()]);
  const visibleContracts = contracts.filter((contract) => canViewContract(session, contract));
  const marketTerms = uniqueTerms(visibleContracts.flatMap((contract) => [
    contract.market,
    ...(contract.markets ?? []),
    ...(contract.coverage ?? []),
    contract.airline,
    contract.gsaName,
  ]));
  const routeTerms = uniqueTerms(visibleContracts.flatMap((contract) =>
    contract.contractRoutes.flatMap((route) => [
      route.origin,
      route.destination,
      `${route.origin}-${route.destination}`,
      `${route.origin} ${route.destination}`,
    ]),
  ));
  const contextTerms = uniqueTerms([...marketTerms, ...routeTerms]);
  const signals = posts
    .map((post) => scorePost(post, visibleContracts, contextTerms))
    .filter((signal) => signal.relevanceScore > 0 || signal.post.confidence >= 70)
    .sort((left, right) =>
      right.relevanceScore - left.relevanceScore ||
      right.post.confidence - left.post.confidence ||
      right.post.publishedAt.localeCompare(left.post.publishedAt),
    );

  return {
    contracts: visibleContracts,
    marketTerms,
    routeTerms,
    signals,
    unclassifiedCount: posts.filter((post) => !post.category || post.confidence < 50).length,
    highConfidenceCount: posts.filter((post) => post.confidence >= 70).length,
  };
}

function scorePost(post: NewsPost, contracts: LivePartnerContract[], contextTerms: string[]): ContextualNewsSignal {
  const haystack = `${post.title} ${post.source} ${post.category ?? ""} ${post.market} ${post.summary}`.toLowerCase();
  const matchedTerms = contextTerms.filter((term) => haystack.includes(term.toLowerCase()));
  const matchedContracts = contracts
    .filter((contract) => contractMatchesPost(contract, haystack, matchedTerms))
    .map((contract) => ({
      id: contract.id,
      gsaName: contract.gsaName,
      market: contract.market,
      assignedRouteCount: contract.contractRoutes.filter((route) => route.status === "assigned").length,
    }));
  const categoryScore = post.category ? 12 : 0;
  const confidenceScore = Math.min(25, Math.max(0, post.confidence) / 4);
  const contractScore = Math.min(35, matchedContracts.length * 12);
  const termScore = Math.min(28, matchedTerms.length * 6);
  return {
    post,
    relevanceScore: Math.round(categoryScore + confidenceScore + contractScore + termScore),
    matchedTerms,
    matchedContracts,
  };
}

function contractMatchesPost(contract: LivePartnerContract, haystack: string, matchedTerms: string[]) {
  const contractTerms = uniqueTerms([
    contract.market,
    contract.gsaName,
    contract.airline,
    ...(contract.markets ?? []),
    ...(contract.coverage ?? []),
    ...contract.contractRoutes.flatMap((route) => [
      route.origin,
      route.destination,
      `${route.origin}-${route.destination}`,
      `${route.origin} ${route.destination}`,
    ]),
  ]);
  return contractTerms.some((term) => haystack.includes(term.toLowerCase()) || matchedTerms.includes(term));
}

function uniqueTerms(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const value of values) {
    for (const part of splitTerm(value)) {
      const normalized = part.trim();
      if (normalized.length < 3) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(normalized);
    }
  }
  return terms;
}

function splitTerm(value: string | undefined) {
  if (!value) return [];
  return value
    .split(/[,/|;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
