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
  const acceptedGsas = {
    ...base.acceptedGsas,
    ...(parsed.acceptedGsas ?? {}),
  };

  return {
    applicationStatuses: {
      ...base.applicationStatuses,
      ...(parsed.applicationStatuses ?? {}),
    },
    acceptedGsas: normalizeExclusiveRouteAssignments(acceptedGsas),
  };
}

function normalizeExclusiveRouteAssignments(acceptedGsas: AirlineGsaWorkflowState["acceptedGsas"]) {
  const seenRouteIds = new Set<string>();

  return Object.fromEntries(
    Object.entries(acceptedGsas).map(([gsaId, assignment]) => {
      const routeIds = assignment.routeIds.filter((routeId) => {
        if (seenRouteIds.has(routeId)) return false;
        seenRouteIds.add(routeId);
        return true;
      });

      return [gsaId, { ...assignment, routeIds }];
    }),
  );
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
      const uniqueRouteIds = Array.from(new Set(routeIds));
      const currentAssignment = current.acceptedGsas[gsaId] ?? {
        gsaId,
        acceptedAt: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        routeIds: [],
      };
      const acceptedGsas = Object.fromEntries(
        Object.entries(current.acceptedGsas).map(([assignedGsaId, assignment]) => [
          assignedGsaId,
          assignedGsaId === gsaId
            ? assignment
            : {
                ...assignment,
                routeIds: assignment.routeIds.filter((routeId) => !uniqueRouteIds.includes(routeId)),
              },
        ]),
      );

      return {
        ...current,
        acceptedGsas: {
          ...acceptedGsas,
          [gsaId]: {
            ...currentAssignment,
            routeIds: uniqueRouteIds,
          },
        },
      };
    });
  }

  function assignRoute(gsaId: string, routeId: string) {
    const currentRoutes = state.acceptedGsas[gsaId]?.routeIds ?? [];
    if (currentRoutes.includes(routeId)) return;
    setAssignedRoutes(gsaId, [...currentRoutes, routeId]);
  }

  function unassignRoute(gsaId: string, routeId: string) {
    const currentRoutes = state.acceptedGsas[gsaId]?.routeIds ?? [];
    setAssignedRoutes(
      gsaId,
      currentRoutes.filter((id) => id !== routeId),
    );
  }

  function toggleAssignedRoute(gsaId: string, routeId: string) {
    const currentRoutes = state.acceptedGsas[gsaId]?.routeIds ?? [];
    const nextRoutes = currentRoutes.includes(routeId)
      ? currentRoutes.filter((id) => id !== routeId)
      : [...currentRoutes, routeId];
    setAssignedRoutes(gsaId, nextRoutes);
  }

  function setContractPeriod(gsaId: string, period: { contractStart?: string; contractEnd?: string }) {
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
            ...period,
          },
        },
      };
    });
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
    assignRoute,
    unassignRoute,
    toggleAssignedRoute,
    setContractPeriod,
    resetWorkflow,
  };
}
