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
  date: string; // "YYYY-MM"
  revenue: number;
  loadfactor: number;
  yield: number;
};

export type NewsPost = {
  id: string;
  title: string;
  source: string;
  category: NewsCategory | null;
  market: string;
  publishedAt: string;
  summary: string;
  confidence: number;
};

export type LinkedinSource = {
  id: string;
  name: string;
  url: string;
  category: NewsCategory | null;
  status: "active" | "paused";
  lastImport: string;
};

export type LinkedinImportRequest = {
  includeQuotePosts: boolean;
  includeReposts: boolean;
  maxComments: number;
  maxPosts: number;
  maxReactions: number;
  postNestedComments: boolean;
  postNestedReactions: boolean;
  postedLimit: "any" | "1h" | "24h" | "week" | "month" | "3months" | "6months" | "year";
  scrapeComments: boolean;
  scrapeReactions: boolean;
  targetUrls: string[];
};

export type LinkedinImportPostedLimit =
  | "1h"
  | "24h"
  | "week"
  | "month"
  | "3months"
  | "6months"
  | "year"
  | "any";

export type LinkedinImportScheduleUnit = "hours" | "days" | "weeks";

export type LinkedinMediaItem = {
  type: "image" | "document";
  title?: string;
  url: string;
  width?: number;
  height?: number;
};

export type LinkedinPostPreview = {
  id: string;
  linkedinUrl: string;
  authorName: string;
  authorUrl: string;
  content: string;
  postedAt: string;
  media: LinkedinMediaItem[];
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  status: "unread" | "read";
};
