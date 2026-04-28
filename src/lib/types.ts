export type Role = "airline" | "gsa" | "admin";

export type Status =
  | "open"
  | "draft"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "active"
  | "pending"
  | "closed";

export type NewsCategory =
  | "GSA opportunity"
  | "airline expansion"
  | "new route"
  | "cargo capacity"
  | "tender/RFP"
  | "partnership";

export type Tender = {
  id: string;
  title: string;
  airline: string;
  regions: string[];
  lanes: string;
  annualTonnage: number;
  productMix: string;
  deadline: string;
  status: Status;
  requirements: string[];
  expectedStart: string;
};

export type GsaProfile = {
  id: string;
  name: string;
  headquarters: string;
  coverage: string[];
  certifications: string[];
  cargoFocus: string;
  networkScore: number;
  financialScore: number;
  complianceScore: number;
  winRate: number;
  summary: string;
};

export type TenderApplication = {
  id: string;
  tenderId: string;
  gsaId: string;
  gsaName: string;
  commercialScore: number;
  networkScore: number;
  complianceScore: number;
  proposedCommission: string;
  status: Status;
  submittedAt: string;
};

export type KpiPoint = {
  month: string;
  revenue: number;
  loadfactor: number;
  yield: number;
};

export type NewsPost = {
  id: string;
  title: string;
  source: string;
  category: NewsCategory;
  market: string;
  publishedAt: string;
  summary: string;
  confidence: number;
};

export type LinkedinSource = {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  status: "active" | "paused";
  lastImport: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  status: "unread" | "read";
};

