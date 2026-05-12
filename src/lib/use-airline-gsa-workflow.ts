"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AIRLINE_GSA_WORKFLOW_STORAGE_KEY,
  type AirlineGsaWorkflowState,
} from "@/lib/airline-gsa-workflow";
import type { Status, TenderApplication } from "@/lib/types";

function createInitialState(applications: TenderApplication[]): AirlineGsaWorkflowState {
  return {
    applicationStatuses: Object.fromEntries(applications.map((application) => [application.id, application.status])),
    acceptedGsas: Object.fromEntries(
      applications
        .filter((application) => application.status === "accepted")
        .map((application) => [
          application.gsaId,
          { gsaId: application.gsaId, acceptedAt: application.submittedAt, routeIds: [] },
        ]),
    ),
  };
}

function mergeState(base: AirlineGsaWorkflowState, saved: unknown): AirlineGsaWorkflowState {
  if (!saved || typeof saved !== "object") return base;
  const parsed = saved as Partial<AirlineGsaWorkflowState>;

  return {
    applicationStatuses: {
      ...base.applicationStatuses,
      ...(parsed.applicationStatuses ?? {}),
    },
    acceptedGsas: {
      ...base.acceptedGsas,
      ...(parsed.acceptedGsas ?? {}),
    },
  };
}

export function useAirlineGsaWorkflow(applications: TenderApplication[]) {
  const initialState = useMemo(() => createInitialState(applications), [applications]);
  const [state, setState] = useState<AirlineGsaWorkflowState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AIRLINE_GSA_WORKFLOW_STORAGE_KEY);
      if (raw) {
        setState((current) => mergeState(current, JSON.parse(raw)));
      }
    } catch {
      setState(initialState);
    } finally {
      setIsLoaded(true);
    }
  }, [initialState]);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(AIRLINE_GSA_WORKFLOW_STORAGE_KEY, JSON.stringify(state));
  }, [isLoaded, state]);

  function setApplicationStatus(application: TenderApplication, status: Status) {
    setState((current) => {
      const acceptedGsas = { ...current.acceptedGsas };

      if (status === "accepted") {
        acceptedGsas[application.gsaId] = acceptedGsas[application.gsaId] ?? {
          gsaId: application.gsaId,
          acceptedAt: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          routeIds: [],
        };
      }

      if (status === "rejected") {
        delete acceptedGsas[application.gsaId];
      }

      return {
        applicationStatuses: {
          ...current.applicationStatuses,
          [application.id]: status,
        },
        acceptedGsas,
      };
    });
  }

  function setAssignedRoutes(gsaId: string, routeIds: string[]) {
    setState((current) => {
      const currentAssignment = current.acceptedGsas[gsaId] ?? {
        gsaId,
        acceptedAt: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        routeIds: [],
      };

      return {
        ...current,
        acceptedGsas: {
          ...current.acceptedGsas,
          [gsaId]: {
            ...currentAssignment,
            routeIds,
          },
        },
      };
    });
  }

  function toggleAssignedRoute(gsaId: string, routeId: string) {
    const currentRoutes = state.acceptedGsas[gsaId]?.routeIds ?? [];
    const nextRoutes = currentRoutes.includes(routeId)
      ? currentRoutes.filter((id) => id !== routeId)
      : [...currentRoutes, routeId];
    setAssignedRoutes(gsaId, nextRoutes);
  }

  function resetWorkflow() {
    setState(initialState);
  }

  return {
    state,
    applicationStatus: (application: TenderApplication) =>
      state.applicationStatuses[application.id] ?? application.status,
    setApplicationStatus,
    setAssignedRoutes,
    toggleAssignedRoute,
    resetWorkflow,
  };
}
