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
  return (
    idsMatch(tender.airlineCompanyId, session.companyId) ||
    emailsMatch(tender.airlineEmail, session.email) ||
    namesMatch(tender.airline, session.company)
  );
}

export function isApplicationOwnedByGsa(session: SessionPayload, application: LiveTenderApplication) {
  return (
    idsMatch(application.gsaCompanyId, session.companyId) ||
    idsMatch(application.gsaId, session.companyId) ||
    emailsMatch(application.email, session.email) ||
    namesMatch(application.gsaName, session.company)
  );
}

export function isContractOwnedByAirline(session: SessionPayload, contract: LivePartnerContract) {
  return (
    idsMatch(contract.airlineCompanyId, session.companyId) ||
    emailsMatch(contract.airlineEmail, session.email) ||
    namesMatch(contract.airline, session.company)
  );
}

export function isContractOwnedByGsa(session: SessionPayload, contract: LivePartnerContract) {
  return (
    idsMatch(contract.gsaCompanyId, session.companyId) ||
    idsMatch(contract.gsaId, session.companyId) ||
    emailsMatch(contract.email, session.email) ||
    namesMatch(contract.gsaName, session.company)
  );
}

function idsMatch(left?: string, right?: string) {
  return Boolean(left?.trim() && right?.trim() && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function emailsMatch(left?: string, right?: string) {
  return Boolean(left?.trim() && right?.trim() && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function namesMatch(left?: string, right?: string) {
  return Boolean(left?.trim() && right?.trim() && left.trim().toLowerCase() === right.trim().toLowerCase());
}
