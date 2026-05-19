"use client";

import type { LiveTenderApplication } from "@/lib/services/tender-workflow-store";

const AIRLINE_APPLICATIONS_SEEN_EVENT = "airgsa:airline-applications-seen";

type ApplicationNotificationCandidate = {
  status: string;
  submittedAt: string;
};

export type AirlineApplicationSeenState = {
  lastSeenAt: number;
  tenderSeenAt: Record<string, number>;
};

const EMPTY_STATE: AirlineApplicationSeenState = {
  lastSeenAt: 0,
  tenderSeenAt: {},
};

let seenStateRequest: Promise<AirlineApplicationSeenState> | null = null;
let markAllSeenRequest: Promise<AirlineApplicationSeenState> | null = null;
let applicationsRequest: Promise<LiveTenderApplication[]> | null = null;
let lastMarkAllSeenAt = 0;

export async function getAirlineApplicationSeenState(): Promise<AirlineApplicationSeenState> {
  if (typeof window === "undefined") return EMPTY_STATE;
  if (!seenStateRequest) {
    seenStateRequest = fetch("/api/applications/seen", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return EMPTY_STATE;
        const data = await readJsonResponse(response);
        return normalizeSeenState(data.state);
      })
      .catch(() => EMPTY_STATE)
      .finally(() => {
        seenStateRequest = null;
      });
  }
  return seenStateRequest;
}

export async function getAirlineApplicationsForNotifications(): Promise<LiveTenderApplication[]> {
  if (typeof window === "undefined") return [];
  if (!applicationsRequest) {
    applicationsRequest = fetch("/api/applications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const raw = await response.text();
        if (!raw.trim()) return [];
        const data = JSON.parse(raw) as { applications?: LiveTenderApplication[] };
        return data.applications ?? [];
      })
      .catch(() => [])
      .finally(() => {
        applicationsRequest = null;
      });
  }
  return applicationsRequest;
}

export async function markAirlineApplicationsSeen() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (markAllSeenRequest) {
    await markAllSeenRequest;
    return;
  }
  if (now - lastMarkAllSeenAt < 1_500) return;

  lastMarkAllSeenAt = now;
  markAllSeenRequest = updateSeenState({ markAllSeen: true }).finally(() => {
    markAllSeenRequest = null;
  });
  await markAllSeenRequest;
  window.dispatchEvent(new Event(AIRLINE_APPLICATIONS_SEEN_EVENT));
}

export async function markTenderApplicationsSeen(tenderId: string, latestPendingSubmittedAt: number) {
  if (typeof window === "undefined") return EMPTY_STATE;
  const state = await updateSeenState({ tenderId, latestPendingSubmittedAt });
  window.dispatchEvent(new Event(AIRLINE_APPLICATIONS_SEEN_EVENT));
  return state;
}

export function isUnreadAirlineApplication(application: ApplicationNotificationCandidate, lastSeenAt: number) {
  if (application.status !== "pending") return false;
  const submittedAt = new Date(application.submittedAt).getTime();
  if (!Number.isFinite(submittedAt)) return false;
  return submittedAt > lastSeenAt;
}

export function subscribeToAirlineApplicationsSeen(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AIRLINE_APPLICATIONS_SEEN_EVENT, callback);
  return () => {
    window.removeEventListener(AIRLINE_APPLICATIONS_SEEN_EVENT, callback);
  };
}

async function updateSeenState(input: { markAllSeen?: boolean; tenderId?: string; latestPendingSubmittedAt?: number }) {
  const response = await fetch("/api/applications/seen", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return EMPTY_STATE;
  const data = await readJsonResponse(response);
  return normalizeSeenState(data.state);
}

async function readJsonResponse(response: Response): Promise<{ state?: Partial<AirlineApplicationSeenState> | null }> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  return JSON.parse(raw) as { state?: Partial<AirlineApplicationSeenState> | null };
}

function normalizeSeenState(input: Partial<AirlineApplicationSeenState> | null | undefined): AirlineApplicationSeenState {
  return {
    lastSeenAt: normalizeTimestamp(input?.lastSeenAt),
    tenderSeenAt: Object.fromEntries(
      Object.entries(input?.tenderSeenAt ?? {})
        .map(([key, value]) => [key, normalizeTimestamp(value)] as const)
        .filter(([, value]) => value > 0),
    ),
  };
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const date = new Date(value).getTime();
    if (Number.isFinite(date)) return date;
  }
  return 0;
}
