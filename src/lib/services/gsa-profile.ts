import type { SessionPayload } from "@/lib/auth/session";
import { realGsaPartners, type RealGsaPartner } from "@/lib/real-gsa-data";
import type { GsaProfile } from "@/lib/types";
import {
  listLiveApplications,
  listLivePartnerContracts,
  type LivePartnerContract,
  type LiveTenderApplication,
} from "@/lib/services/tender-workflow-store";

type GsaIdentity = Pick<LivePartnerContract | LiveTenderApplication, "gsaId" | "gsaCompanyId" | "gsaName" | "email">;

export async function resolveGsaOperationalProfile(session: SessionPayload | null): Promise<RealGsaPartner> {
  if (!session) return createSessionGsaProfile(session);

  const [contracts, applications] = await Promise.all([listLivePartnerContracts(), listLiveApplications()]);
  const contract = contracts
    .filter((item) => belongsToSession(item, session))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (contract) return realProfileFromContract(contract, session);

  const application = applications
    .filter((item) => item.status === "accepted" && belongsToSession(item, session))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (application) return realProfileFromApplication(application, session);

  return findDirectoryProfile(session.companyId, session.email, session.company) ?? createSessionGsaProfile(session);
}

export async function getGsaProfileById(id: string): Promise<GsaProfile | null> {
  const [contracts, applications] = await Promise.all([listLivePartnerContracts(), listLiveApplications()]);
  const contract = contracts
    .filter((item) => item.gsaId === id || item.gsaCompanyId === id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (contract) return publicProfileFromContract(contract);

  const application = applications
    .filter((item) => (item.gsaId === id || item.gsaCompanyId === id) && item.status === "accepted")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (application) return publicProfileFromApplication(application);

  const directoryProfile = findDirectoryProfile(id);
  return directoryProfile ? publicProfileFromDirectory(directoryProfile) : null;
}

export function createSessionGsaProfile(session: SessionPayload | null): RealGsaPartner {
  const company = session?.company?.trim() || "GSA";
  return {
    id: session?.companyId ?? session?.email ?? "gsa-session",
    name: company,
    contactName: session?.name ?? "GSA user",
    email: session?.email ?? "",
    country: "Germany",
    headquarters: "Not provided",
    coverage: [],
    markets: [],
    certifications: [],
    cargoFocus: "General cargo",
    color: "#2563EB",
    networkScore: 50,
    financialScore: 50,
    complianceScore: 50,
    winRate: 0,
    summary: `${company} has not completed a verified company profile yet. Tender applications and awarded contracts will populate the operational record as the account starts working on AirGSA.`,
  };
}

function belongsToSession(item: GsaIdentity, session: SessionPayload) {
  return (
    normalizedMatch(item.gsaCompanyId, session.companyId) ||
    normalizedMatch(item.gsaId, session.companyId) ||
    normalizedMatch(item.email, session.email) ||
    normalizedMatch(item.gsaName, session.company)
  );
}

function realProfileFromContract(contract: LivePartnerContract, session: SessionPayload): RealGsaPartner {
  const directory = findDirectoryProfile(contract.gsaId, contract.email, contract.gsaName);
  return {
    id: contract.gsaCompanyId ?? contract.gsaId,
    name: contract.gsaName,
    contactName: contract.contactName ?? session.name ?? directory?.contactName ?? "GSA user",
    email: contract.email ?? session.email,
    country: directory?.country ?? "Germany",
    headquarters: contract.headquarters ?? directory?.headquarters ?? "Not provided",
    coverage: nonEmpty(contract.coverage, directory?.coverage),
    markets: nonEmpty(contract.markets, directory?.markets, contract.market ? [contract.market] : []),
    certifications: nonEmpty(contract.certifications, directory?.certifications),
    cargoFocus: contract.cargoFocus ?? directory?.cargoFocus ?? "General cargo",
    color: directory?.color ?? "#2563EB",
    networkScore: contract.networkScore ?? directory?.networkScore ?? 50,
    financialScore: contract.financialScore ?? directory?.financialScore ?? 50,
    complianceScore: contract.complianceScore ?? directory?.complianceScore ?? 50,
    winRate: contract.winRate ?? directory?.winRate ?? 0,
    summary:
      directory?.summary ??
      `${contract.gsaName} is active on AirGSA through an accepted partner contract for ${contract.market}.`,
  };
}

function realProfileFromApplication(application: LiveTenderApplication, session: SessionPayload): RealGsaPartner {
  const directory = findDirectoryProfile(application.gsaId, application.email, application.gsaName);
  return {
    id: application.gsaCompanyId ?? application.gsaId,
    name: application.gsaName,
    contactName: application.contactName || session.name || directory?.contactName || "GSA user",
    email: application.email || session.email,
    country: directory?.country ?? "Germany",
    headquarters: application.headquarters || directory?.headquarters || "Not provided",
    coverage: nonEmpty(application.coverage, directory?.coverage),
    markets: nonEmpty(application.markets, directory?.markets),
    certifications: nonEmpty(application.certifications, directory?.certifications),
    cargoFocus: application.cargoFocus || directory?.cargoFocus || "General cargo",
    color: directory?.color ?? "#2563EB",
    networkScore: application.networkScore || directory?.networkScore || 50,
    financialScore: application.financialScore || directory?.financialScore || 50,
    complianceScore: application.complianceScore || directory?.complianceScore || 50,
    winRate: application.winRate || directory?.winRate || 0,
    summary:
      directory?.summary ??
      `${application.gsaName} was accepted through a live tender application and is available as a working GSA partner.`,
  };
}

function publicProfileFromContract(contract: LivePartnerContract): GsaProfile {
  const directory = findDirectoryProfile(contract.gsaId, contract.email, contract.gsaName);
  return {
    id: contract.gsaCompanyId ?? contract.gsaId,
    name: contract.gsaName,
    headquarters: contract.headquarters ?? directory?.headquarters ?? "Not provided",
    coverage: nonEmpty(contract.coverage, contract.markets, directory?.coverage),
    certifications: nonEmpty(contract.certifications, directory?.certifications),
    cargoFocus: contract.cargoFocus ?? directory?.cargoFocus ?? "General cargo",
    networkScore: contract.networkScore ?? directory?.networkScore ?? 50,
    financialScore: contract.financialScore ?? directory?.financialScore ?? 50,
    complianceScore: contract.complianceScore ?? directory?.complianceScore ?? 50,
    winRate: contract.winRate ?? directory?.winRate ?? 0,
    summary:
      directory?.summary ??
      `${contract.gsaName} is active on AirGSA through an accepted partner contract for ${contract.market}.`,
  };
}

function publicProfileFromApplication(application: LiveTenderApplication): GsaProfile {
  const directory = findDirectoryProfile(application.gsaId, application.email, application.gsaName);
  return {
    id: application.gsaCompanyId ?? application.gsaId,
    name: application.gsaName,
    headquarters: application.headquarters || directory?.headquarters || "Not provided",
    coverage: nonEmpty(application.coverage, application.markets, directory?.coverage),
    certifications: nonEmpty(application.certifications, directory?.certifications),
    cargoFocus: application.cargoFocus || directory?.cargoFocus || "General cargo",
    networkScore: application.networkScore || directory?.networkScore || 50,
    financialScore: application.financialScore || directory?.financialScore || 50,
    complianceScore: application.complianceScore || directory?.complianceScore || 50,
    winRate: application.winRate || directory?.winRate || 0,
    summary:
      directory?.summary ??
      `${application.gsaName} was accepted through a live tender application and is available as a working GSA partner.`,
  };
}

function publicProfileFromDirectory(directoryProfile: RealGsaPartner): GsaProfile {
  return {
    id: directoryProfile.id,
    name: directoryProfile.name,
    headquarters: directoryProfile.headquarters,
    coverage: directoryProfile.coverage,
    certifications: directoryProfile.certifications,
    cargoFocus: directoryProfile.cargoFocus,
    networkScore: directoryProfile.networkScore,
    financialScore: directoryProfile.financialScore,
    complianceScore: directoryProfile.complianceScore,
    winRate: directoryProfile.winRate,
    summary: directoryProfile.summary,
  };
}

function findDirectoryProfile(id?: string, email?: string, name?: string) {
  return realGsaPartners.find((partner) => partner.id === id || partner.email === email || partner.name === name);
}

function nonEmpty<T>(...values: Array<T[] | undefined>) {
  return values.find((value) => value && value.length > 0) ?? [];
}

function normalizedMatch(left?: string, right?: string) {
  return Boolean(left?.trim() && right?.trim() && left.trim().toLowerCase() === right.trim().toLowerCase());
}
