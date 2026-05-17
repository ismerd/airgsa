import type { SessionPayload } from "@/lib/auth/session";
import type { LivePartnerContract, LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export function getSessionTenantKey(session: Pick<SessionPayload, "companyId" | "email" | "company">) {
  return session.companyId ?? session.email.toLowerCase() ?? session.company.toLowerCase();
}

export function canViewTender(session: SessionPayload, tender: LiveTender) {
  if (session.role === "admin") return true;
  if (session.role === "gsa") return tender.status === "open";
  return isTenderOwnedByAirline(session, tender);
}

export function canEditTender(session: SessionPayload, tender: LiveTender) {
  if (session.role === "admin") return true;
  if (session.role !== "airline") return false;
  return isTenderOwnedByAirline(session, tender);
}

export function canDeleteTender(session: SessionPayload, tender: LiveTender) {
  return canEditTender(session, tender);
}

export function canCreateApplication(session: SessionPayload, tender: LiveTender) {
  return session.role === "gsa" && tender.status === "open";
}

export function canViewApplication(session: SessionPayload, application: LiveTenderApplication, tender: LiveTender | null) {
  if (session.role === "admin") return true;
  if (session.role === "gsa") return isApplicationOwnedByGsa(session, application);
  return Boolean(tender && isTenderOwnedByAirline(session, tender));
}

export function canReviewApplication(session: SessionPayload, application: LiveTenderApplication, tender: LiveTender | null) {
  if (session.role === "admin") return true;
  if (session.role !== "airline" || !tender) return false;
  return isTenderOwnedByAirline(session, tender) && application.tenderId === tender.id;
}

export function canViewContract(session: SessionPayload, contract: LivePartnerContract) {
  if (session.role === "admin") return true;
  if (session.role === "airline") return isContractOwnedByAirline(session, contract);
  if (session.role === "gsa") return isContractOwnedByGsa(session, contract);
  return false;
}

export function canEditContract(session: SessionPayload, contract: LivePartnerContract) {
  if (session.role === "admin") return true;
  if (session.role !== "airline") return false;
  if (session.accessRole === "operator" || session.accessRole === "viewer") return false;
  return isContractOwnedByAirline(session, contract);
}

export function canManageWorkflow(session: SessionPayload) {
  return session.role === "admin" || session.accessRole === undefined || ["owner", "admin", "manager"].includes(session.accessRole);
}

export function isTenderOwnedByAirline(session: SessionPayload, tender: LiveTender) {
  if (tender.airlineCompanyId && session.companyId) return tender.airlineCompanyId === session.companyId;
  return tender.airlineEmail.toLowerCase() === session.email.toLowerCase();
}

export function isApplicationOwnedByGsa(session: SessionPayload, application: LiveTenderApplication) {
  if (application.gsaCompanyId && session.companyId) return application.gsaCompanyId === session.companyId;
  return application.gsaName === session.company || application.email.toLowerCase() === session.email.toLowerCase();
}

export function isContractOwnedByAirline(session: SessionPayload, contract: LivePartnerContract) {
  if (contract.airlineCompanyId && session.companyId) return contract.airlineCompanyId === session.companyId;
  return contract.airlineEmail.toLowerCase() === session.email.toLowerCase();
}

export function isContractOwnedByGsa(session: SessionPayload, contract: LivePartnerContract) {
  if (contract.gsaCompanyId && session.companyId) return contract.gsaCompanyId === session.companyId;
  return contract.gsaName === session.company || contract.email?.toLowerCase() === session.email.toLowerCase();
}
