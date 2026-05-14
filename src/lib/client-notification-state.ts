"use client";

const AIRLINE_APPLICATIONS_LAST_SEEN_KEY = "airgsa.airline.applications.lastSeenAt";
const AIRLINE_APPLICATIONS_SEEN_EVENT = "airgsa:airline-applications-seen";

type ApplicationNotificationCandidate = {
  status: string;
  submittedAt: string;
};

export function getAirlineApplicationsLastSeenAt() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(AIRLINE_APPLICATIONS_LAST_SEEN_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function markAirlineApplicationsSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AIRLINE_APPLICATIONS_LAST_SEEN_KEY, String(Date.now()));
  window.dispatchEvent(new Event(AIRLINE_APPLICATIONS_SEEN_EVENT));
}

export function isUnreadAirlineApplication(application: ApplicationNotificationCandidate) {
  if (application.status !== "pending") return false;
  const submittedAt = new Date(application.submittedAt).getTime();
  if (!Number.isFinite(submittedAt)) return false;
  return submittedAt > getAirlineApplicationsLastSeenAt();
}

export function subscribeToAirlineApplicationsSeen(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AIRLINE_APPLICATIONS_SEEN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AIRLINE_APPLICATIONS_SEEN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
