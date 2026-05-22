"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Gem,
  Globe2,
  HeartPulse,
  Mail,
  Package,
  PawPrint,
  Plane,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  Trash2,
  Truck,
  Users as UsersIcon,
  X,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { AirportCodePicker } from "@/components/dashboard/freight-field-selects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type WizardStep = 0 | 1 | 2 | 3 | 4;

type TenderWizardForm = {
  title: string;
  region: string;
  mandateType: string;
  coverageModel: string;
  airports: string;
  routes: TenderRouteDraft[];
  cargoTypes: string;
  expectedMonthlyTonnage: string;
  targetLoadFactor: string;
  monthlyRevenueTarget: string;
  contractDuration: string;
  applicationDeadline: string;
  startDate: string;
  commercialModel: string;
  commissionRate: string;
  reportingCadence: string;
  requiredCapabilities: string;
  requiredExperience: string;
  requiredCertifications: string;
  salesExpectations: string;
  additionalNotes: string;
};

type TenderRouteDraft = {
  id: string;
  origin: string;
  destination: string;
  frequencyPerWeek: string;
  operatingDays: string[];
  aircraft: string;
};

type SearchOption = {
  value: string;
  label: string;
  meta: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

type TenderBuilderDraft = {
  version: number;
  form: TenderWizardForm;
  step: WizardStep;
  showOptionalLocationDetails: boolean;
  savedAt: string;
};

const TENDER_BUILDER_DRAFT_VERSION = 1;

const steps = [
  { label: "Scope", icon: Globe2 },
  { label: "Cargo and timing", icon: Package },
  { label: "Proof required", icon: ClipboardList },
  { label: "Money and reporting", icon: FileText },
  { label: "Review", icon: CheckCircle2 },
];

const initialForm: TenderWizardForm = {
  title: "",
  region: "",
  mandateType: "full-gsa",
  coverageModel: "country-wide",
  airports: "",
  routes: [],
  cargoTypes: "",
  expectedMonthlyTonnage: "",
  targetLoadFactor: "",
  monthlyRevenueTarget: "",
  contractDuration: "",
  applicationDeadline: "",
  startDate: "",
  commercialModel: "commission",
  commissionRate: "",
  reportingCadence: "weekly",
  requiredCapabilities: "",
  requiredExperience: "",
  requiredCertifications: "",
  salesExpectations: "",
  additionalNotes: "",
};

const cargoTypeOptions: SearchOption[] = [
  cargoType("General cargo", "Standard dry cargo", Package),
  cargoType("Automotive", "Automotive parts and components", Car),
  cargoType("Pharmaceuticals", "Temperature-sensitive pharma cargo", HeartPulse),
  cargoType("Temperature controlled", "Active or passive cool-chain shipments", Snowflake),
  cargoType("Perishables", "Fresh food, flowers, and time-sensitive perishables", Clock),
  cargoType("Dangerous goods", "DG acceptance and compliant handling", ShieldAlert),
  cargoType("Lithium batteries", "Battery shipments requiring DG controls", BatteryCharging),
  cargoType("E-commerce", "Parcel and cross-border e-commerce flows", ShoppingCart),
  cargoType("Express cargo", "Priority parcel and premium cargo flows", Truck),
  cargoType("Time-critical / urgent", "Emergency shipments, hand-carry, NFO, and line-stopper freight", Zap),
  cargoType("Live animals", "AVI shipments", PawPrint),
  cargoType("Valuables", "High-value cargo and secure handling", Gem),
  cargoType("Oversized cargo", "Heavy, outsized, or project cargo", Package),
  cargoType("Humanitarian cargo", "Relief, NGO, and emergency shipments", HeartPulse),
  cargoType("Mail", "Postal and mail traffic", Mail),
  cargoType("AOG", "Aircraft-on-ground urgent parts", Plane),
];

const mandateTypeOptions: SearchOption[] = [
  { value: "full-gsa", label: "Full GSA mandate", meta: "Sales representation, account coverage, reporting, and market ownership" },
  { value: "sales-only", label: "Sales-only representation", meta: "Commercial sales focus without operational handling ownership" },
  { value: "route-launch", label: "Route launch", meta: "Launch and activate specific lanes or new capacity" },
  { value: "product-specialist", label: "Product specialist", meta: "Special cargo product focus such as pharma, DG, e-commerce, or perishables" },
  { value: "regional-cluster", label: "Regional cluster", meta: "One mandate covering multiple connected markets" },
];

const coverageModelOptions: SearchOption[] = [
  { value: "country-wide", label: "Country-wide", meta: "GSA covers the market nationally; airports and routes are optional detail" },
  { value: "airport-led", label: "Airport-led", meta: "Mandate depends on specific airports or cities" },
  { value: "route-led", label: "Route-led", meta: "Mandate is tied to concrete origin-destination lanes" },
  { value: "regional-cluster", label: "Regional cluster", meta: "Mandate spans a cluster such as Benelux, DACH, GCC, or Nordics" },
];

const commercialModelOptions: SearchOption[] = [
  { value: "commission", label: "Commission", meta: "GSA earns a commission on sold cargo revenue; best for standard market representation" },
  { value: "capacity-risk", label: "Capacity commitment", meta: "GSA commits to a monthly revenue result and capacity controls; best for critical lanes or blocked capacity" },
  { value: "hybrid", label: "Hybrid", meta: "Base commission plus performance upside; best when airline wants both coverage and growth" },
];

const capabilityOptions: SearchOption[] = [
  { value: "IATA CASS", label: "IATA CASS", meta: "Settlement and local billing capability" },
  { value: "Local cargo sales team", label: "Local cargo sales team", meta: "Named staff with market accountability" },
  { value: "Tier-1 forwarder access", label: "Tier-1 forwarder access", meta: "Established relationships with major forwarding accounts" },
  { value: "Weekly sales reporting", label: "Weekly sales reporting", meta: "Structured pipeline, quote, booking, and revenue reporting" },
  { value: "Airline system access", label: "Airline system access", meta: "Ability to work in airline booking/reporting systems" },
  { value: "CargoWise / eCargoWare familiarity", label: "CargoWise / eCargoWare familiarity", meta: "Operationally ready for connected cargo workflows" },
  { value: "GDP / pharma handling", label: "GDP / pharma handling", meta: "Cold-chain and life-science process knowledge" },
  { value: "Dangerous goods capability", label: "Dangerous goods capability", meta: "DG acceptance workflow and document discipline" },
  { value: "Claims and irregularity handling", label: "Claims and irregularity handling", meta: "Customer-facing service recovery process" },
  { value: "Launch plan within 90 days", label: "Launch plan within 90 days", meta: "Immediate market activation plan after award" },
];

const experienceProofOptions: SearchOption[] = [
  { value: "Similar airline cargo mandate experience", label: "Similar GSA mandate", meta: "Has managed comparable airline representation before", Icon: Plane },
  { value: "Named local sales team", label: "Named sales team", meta: "Clear local owner and sales coverage model", Icon: UsersIcon },
  { value: "Top forwarder relationship proof", label: "Forwarder access proof", meta: "Can prove access to relevant market accounts", Icon: Globe2 },
  { value: "Route launch experience", label: "Route launch proof", meta: "Has activated new lanes or new capacity before", Icon: Truck },
  { value: "Special cargo product experience", label: "Product experience", meta: "Experience matching the selected cargo products", Icon: Package },
  { value: "Monthly performance reporting sample", label: "Reporting sample", meta: "Can show repeatable KPI and pipeline reporting", Icon: FileText },
  { value: "Claims and service recovery process", label: "Service recovery", meta: "Has a documented process for irregularities", Icon: ShieldAlert },
  { value: "Customer reference or case study", label: "Reference / case study", meta: "Can attach one relevant proof document", Icon: ClipboardList },
];

const certificationOptions: SearchOption[] = [
  { value: "IATA CASS", label: "IATA CASS", meta: "Local billing and settlement capability", Icon: CheckCircle2 },
  { value: "IATA CEIV Pharma", label: "CEIV Pharma", meta: "Pharma handling certification or equivalent", Icon: HeartPulse },
  { value: "GDP pharma process", label: "GDP pharma", meta: "Good Distribution Practice process knowledge", Icon: HeartPulse },
  { value: "Dangerous goods trained staff", label: "DG trained staff", meta: "DG acceptance and document capability", Icon: ShieldAlert },
  { value: "Lithium battery handling process", label: "Lithium battery process", meta: "Battery shipment controls and documentation", Icon: BatteryCharging },
  { value: "ISO 9001 or quality system", label: "Quality system", meta: "Documented quality or audit process", Icon: ClipboardList },
  { value: "Cargo security program", label: "Security program", meta: "Secure cargo and high-value handling process", Icon: ShieldAlert },
  { value: "Airline system access readiness", label: "System access ready", meta: "Ready to work with airline booking/reporting tools", Icon: Package },
];

const weekdayOptions = [
  { value: "Mon", label: "Mo" },
  { value: "Tue", label: "Tu" },
  { value: "Wed", label: "We" },
  { value: "Thu", label: "Th" },
  { value: "Fri", label: "Fr" },
  { value: "Sat", label: "Sa" },
  { value: "Sun", label: "Su" },
];

const emptyRouteDraft: TenderRouteDraft = {
  id: "new-route",
  origin: "",
  destination: "",
  frequencyPerWeek: "1",
  operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  aircraft: "",
};

const aircraftOptions = [
  "A320",
  "A321",
  "A321F",
  "A330",
  "A330F",
  "A350",
  "A350F",
  "B738",
  "B737F",
  "B757F",
  "B767F",
  "B777",
  "B777F",
  "B787",
  "B747F",
  "B747-8F",
  "MD-11F",
  "ATR72F",
];

export function CreateTenderClient({ airlineName }: { airlineName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<TenderWizardForm>(initialForm);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptionalLocationDetails, setShowOptionalLocationDetails] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const draftStorageKey = useMemo(
    () => `airgsa:tender-builder:${slugifyStorageKey(airlineName)}:v${TENDER_BUILDER_DRAFT_VERSION}`,
    [airlineName],
  );
  const preview = useMemo(() => buildPreview(form, airlineName), [airlineName, form]);
  const canContinue = getStepValidity(step, form);
  const requiresAirportScope = form.coverageModel === "airport-led";
  const requiresRouteScope = form.coverageModel === "route-led";
  const showAirportSection = requiresAirportScope || (!requiresRouteScope && showOptionalLocationDetails);
  const showRouteSection = requiresRouteScope || (!requiresAirportScope && showOptionalLocationDetails);
  const showLocationToggle = !requiresAirportScope && !requiresRouteScope;
  const marketCopy = getMarketScopeCopy(form.coverageModel);
  const optionalLocationCopy = getOptionalLocationCopy(form.coverageModel);
  const commercialCopy = getCommercialModelCopy(form.commercialModel);
  const showCommissionTarget = form.commercialModel === "commission" || form.commercialModel === "hybrid";
  const showRevenueTarget = form.commercialModel === "capacity-risk" || form.commercialModel === "hybrid";

  useEffect(() => {
    if (requiresAirportScope || requiresRouteScope) {
      setShowOptionalLocationDetails(false);
    }
  }, [requiresAirportScope, requiresRouteScope]);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) return;
      const saved = JSON.parse(rawDraft) as Partial<TenderBuilderDraft>;
      if (saved.version !== TENDER_BUILDER_DRAFT_VERSION) return;
      const restoredForm = normalizeStoredForm(saved.form);
      if (!restoredForm) return;
      setForm(restoredForm);
      setStep(isWizardStep(saved.step) ? saved.step : 0);
      setShowOptionalLocationDetails(Boolean(saved.showOptionalLocationDetails));
      setLastSavedAt(typeof saved.savedAt === "string" ? saved.savedAt : null);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftReady(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    const handle = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: TenderBuilderDraft = {
        version: TENDER_BUILDER_DRAFT_VERSION,
        form,
        step,
        showOptionalLocationDetails,
        savedAt,
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [draftReady, draftStorageKey, form, showOptionalLocationDetails, step]);

  async function submit(status: "draft" | "open") {
    setSaving(status === "open" ? "publish" : "draft");
    setError(null);

    try {
      const regions = splitList(form.region);
      const airports = splitList(form.airports).map((airport) => airport.toUpperCase());
      const requirements = [
        ...splitList(form.requiredCapabilities).map((item) => `Capability: ${item}`),
        ...splitList(form.requiredExperience).map((item) => `Experience: ${item}`),
        ...splitList(form.requiredCertifications).map((item) => `Certification: ${item}`),
      ];
      const commercialExpectations = [
        getOptionLabel(coverageModelOptions, form.coverageModel) ? `Coverage model: ${getOptionLabel(coverageModelOptions, form.coverageModel)}` : "",
        getOptionLabel(commercialModelOptions, form.commercialModel) ? `Commercial model: ${getOptionLabel(commercialModelOptions, form.commercialModel)}` : "",
        form.commissionRate ? `Target commission: ${form.commissionRate}%` : "",
        form.targetLoadFactor ? `Target load factor: ${form.targetLoadFactor}%` : "",
        form.monthlyRevenueTarget ? `Monthly revenue commitment: ${form.monthlyRevenueTarget}` : "",
        form.reportingCadence ? `Reporting cadence: ${getReportingCadenceLabel(form.reportingCadence)}` : "",
        form.salesExpectations,
        form.contractDuration ? `Contract duration: ${form.contractDuration}` : "",
        form.additionalNotes ? `Additional notes: ${form.additionalNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const monthly = Number(form.expectedMonthlyTonnage) || 0;
      const routes = form.routes.map((route) => ({
        id: `${route.origin}-${route.destination}`,
        origin: route.origin,
        destination: route.destination,
        frequencyPerWeek: Number(route.frequencyPerWeek) || 1,
        weekday: route.operatingDays.join(", "),
        operatingDays: route.operatingDays.join(", "),
        aircraft: route.aircraft.trim() || undefined,
      }));

      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          countryScope: form.region.trim(),
          regions,
          lanes: airports.length ? airports.join(", ") : form.region.trim(),
          annualTonnage: monthly * 12,
          productMix: form.cargoTypes.trim(),
          deadline: form.applicationDeadline,
          expectedStart: form.startDate,
          status,
          awardMode: "single",
          maxAwards: 1,
          mandateType: form.mandateType,
          coverageModel: form.coverageModel,
          commercialModel: form.commercialModel,
          commissionRate: Number(form.commissionRate) || undefined,
          targetLoadFactor: Number(form.targetLoadFactor) || undefined,
          monthlyRevenueTarget: Number(form.monthlyRevenueTarget) || undefined,
          reportingCadence: form.reportingCadence,
          requiredCapabilities: splitList(form.requiredCapabilities),
          requirements,
          commercialExpectations,
          routes,
          attachments: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Tender could not be saved");
        return;
      }

      const data = await res.json();
      clearTenderBuilderDraft();
      router.push(`/airline/tenders/${data.tender.id}`);
    } catch {
      setError("Tender could not be saved. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Topbar title="Tender setup" subtitle="Simple GSA mandate builder" />
      <main className="grid gap-5 p-5 xl:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tender checklist</CardTitle>
            <p className="text-sm text-ink-muted">Answer only the decisions that affect the award. Drafts save automatically.</p>
            <div className="mt-3 rounded-xl border border-border-ui bg-surface2 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Autosave</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {lastSavedAt ? `Saved ${formatAutosaveTime(lastSavedAt)}` : draftReady ? "Ready to save changes automatically." : "Loading saved draft..."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startFresh}
                  className="shrink-0 rounded-lg border border-border-ui px-2 py-1 text-xs font-semibold text-ink-muted transition hover:border-danger/40 hover:bg-danger-bg hover:text-danger"
                >
                  Start fresh
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = index === step;
              const done = index < step;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStep(index as WizardStep)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : done
                        ? "border-[#0B7A52]/20 bg-success-bg text-success"
                        : "border-border-ui bg-surface2 text-ink-muted hover:border-brand/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{index + 1}. {item.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <section className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>{steps[step].label}</CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">{getStepHelper(step)}</p>
                </div>
                <Badge variant="muted">Step {step + 1} of {steps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border-ui bg-surface2 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Airline</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{airlineName}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">Taken from your signed-in airline workspace.</p>
                  </div>
                  <Field label="Tender name">
                    <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={`${airlineName} Central Europe representation`} />
                  </Field>
                  <Field label="What should the GSA do?" className="md:col-span-2">
                    <OptionCardSelect
                      options={mandateTypeOptions}
                      value={form.mandateType}
                      onChange={updateMandateType}
                    />
                    <ScopeGuidance title="Plain English" body={getMandateGuidance(form.mandateType)} />
                  </Field>
                  <Field label="Where should the GSA work?" className="md:col-span-2">
                    <OptionCardSelect
                      options={coverageModelOptions}
                      value={form.coverageModel}
                      onChange={updateCoverageModel}
                    />
                    <ScopeGuidance title="What changes on this page" body={getCoverageGuidance(form.coverageModel)} />
                  </Field>
                  <div className="md:col-span-2">
                    <ScopeChecklist coverageModel={form.coverageModel} />
                  </div>
                  <Field label={marketCopy.label} className="md:col-span-2">
                    <SearchChipSelect
                      kind="countries"
                      value={splitList(form.region)}
                      onChange={(values) => update("region", values.join(", "))}
                      placeholder={marketCopy.placeholder}
                      emptyText="No market found."
                      coverageText={marketCopy.coverageText}
                    />
                  </Field>
                  {showLocationToggle && (
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setShowOptionalLocationDetails((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border-ui bg-surface2 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                      >
                        <Plus className={`h-4 w-4 transition ${showOptionalLocationDetails ? "rotate-45" : ""}`} />
                        {showOptionalLocationDetails ? optionalLocationCopy.hideLabel : optionalLocationCopy.showLabel}
                      </button>
                      <p className="mt-2 text-xs leading-5 text-ink-muted">
                        {optionalLocationCopy.helper}
                      </p>
                    </div>
                  )}
                  {showAirportSection && (
                    <Field label={requiresAirportScope ? "Required airports / cities" : "Optional airports / cities"} className="md:col-span-2">
                      <SearchChipSelect
                        kind="airports"
                        value={splitList(form.airports)}
                        onChange={(values) => update("airports", values.join(", "))}
                        placeholder="Search by airport code, city, or airport name..."
                        emptyText="No airport found."
                        coverageText={requiresAirportScope
                          ? "Required for airport-led mandates. Search covers 9,000+ IATA airports."
                          : "Optional detail. Search covers 9,000+ IATA airports."}
                      />
                    </Field>
                  )}
                  {showRouteSection && (
                    <Field label={requiresRouteScope ? "Required route lanes" : "Optional route lanes"} className="md:col-span-2">
                      <RouteLaneBuilder
                        routes={form.routes}
                        required={requiresRouteScope}
                        helper={requiresRouteScope
                          ? "Required for route-led mandates. Add at least one origin-destination lane before continuing."
                          : "Optional, but useful when the tender is tied to known lane opportunities."}
                        onChange={(routes) => setForm((current) => ({ ...current, routes }))}
                      />
                    </Field>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Cargo products" className="md:col-span-2">
                    <StaticChipSelect
                      options={cargoTypeOptions}
                      value={splitList(form.cargoTypes)}
                      onChange={(values) => update("cargoTypes", values.join(", "))}
                      placeholder="Search cargo product or handling type..."
                      emptyText="No cargo type found."
                      helper="Select one or more cargo types covered by this GSA mandate."
                    />
                  </Field>
                  <Field label="Monthly tonnage target (tons)">
                    <Input value={form.expectedMonthlyTonnage} onChange={(event) => update("expectedMonthlyTonnage", event.target.value)} type="number" placeholder="1500" />
                  </Field>
                  <Field label="Target load factor (%)">
                    <Input value={form.targetLoadFactor} onChange={(event) => update("targetLoadFactor", event.target.value)} type="number" min={0} max={100} placeholder="70" />
                  </Field>
                  <Field label="Contract length">
                    <Select value={form.contractDuration} onChange={(event) => update("contractDuration", event.target.value)}>
                      <option value="">Select contract duration</option>
                      <option value="6 months pilot">6 months pilot</option>
                      <option value="12 months">12 months</option>
                      <option value="24 months">24 months</option>
                      <option value="24 months with 12-month extension option">24 months with 12-month extension option</option>
                      <option value="36 months">36 months</option>
                    </Select>
                  </Field>
                  <Field label="Application deadline">
                    <Input value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} type="date" />
                    <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                      Last day GSAs can submit their proposal.
                    </p>
                  </Field>
                  <Field label="Planned contract start">
                    <Input value={form.startDate} onChange={(event) => update("startDate", event.target.value)} type="date" />
                    <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                      Preferred go-live date for the awarded contract. GSAs answer separately how many weeks after award they need to launch.
                    </p>
                  </Field>
                  <TimelineExplainer />
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Must-have capabilities" className="md:col-span-2">
                    <StaticChipSelect
                      options={capabilityOptions}
                      value={splitList(form.requiredCapabilities)}
                      onChange={(values) => update("requiredCapabilities", values.join(", "))}
                      placeholder="Search capability requirement..."
                      emptyText="No capability found."
                      helper="These become mandatory comparison points for GSA applications and airline evaluation."
                    />
                  </Field>
                  <Field label="Experience proof" className="md:col-span-2">
                    <StaticChipSelect
                      options={experienceProofOptions}
                      value={splitList(form.requiredExperience)}
                      onChange={(values) => update("requiredExperience", values.join(", "))}
                      placeholder="Search proof type..."
                      emptyText="No proof type found."
                      helper="Pick the proof you want GSAs to show. This is easier to compare than a paragraph."
                      search="never"
                    />
                  </Field>
                  <Field label="Certifications and compliance" className="md:col-span-2">
                    <StaticChipSelect
                      options={certificationOptions}
                      value={splitList(form.requiredCertifications)}
                      onChange={(values) => update("requiredCertifications", values.join(", "))}
                      placeholder="Search certification..."
                      emptyText="No certification found."
                      helper="Select only what is truly required for this mandate. Optional nice-to-have items should stay out."
                      search="never"
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="How should the GSA be paid or measured?" className="md:col-span-2">
                    <OptionCardSelect
                      options={commercialModelOptions}
                      value={form.commercialModel}
                      onChange={updateCommercialModel}
                    />
                    <ScopeGuidance title="How this model is evaluated" body={commercialCopy.guidance} />
                  </Field>
                  <div className="md:col-span-2">
                    <CommercialChecklist commercialModel={form.commercialModel} />
                  </div>
                  {showCommissionTarget && (
                    <Field label={commercialCopy.commissionLabel}>
                      <Input value={form.commissionRate} onChange={(event) => update("commissionRate", event.target.value)} type="number" min={0} max={100} placeholder={commercialCopy.commissionPlaceholder} />
                      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{commercialCopy.commissionHelper}</p>
                    </Field>
                  )}
                  {showRevenueTarget && (
                    <Field label={commercialCopy.revenueLabel}>
                      <Input value={form.monthlyRevenueTarget} onChange={(event) => update("monthlyRevenueTarget", event.target.value)} type="number" min={0} placeholder={commercialCopy.revenuePlaceholder} />
                      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{commercialCopy.revenueHelper}</p>
                    </Field>
                  )}
                  <Field label="Review rhythm">
                    <Select value={form.reportingCadence} onChange={(event) => update("reportingCadence", event.target.value)}>
                      <option value="weekly">Weekly sales review</option>
                      <option value="biweekly">Biweekly pipeline review</option>
                      <option value="monthly">Monthly business review</option>
                      <option value="quarterly">Quarterly steering review</option>
                    </Select>
                  </Field>
                  <Field label="What the GSA must prove" className="md:col-span-2">
                    <StaticChipSelect
                      options={getCommercialRequirementOptions(form.commercialModel)}
                      value={splitList(form.salesExpectations)}
                      onChange={(values) => update("salesExpectations", values.join(", "))}
                      placeholder="Search commercial requirement..."
                      emptyText="No commercial requirement found."
                      helper={commercialCopy.requirementsHelper}
                    />
                  </Field>
                  <Field label="Rules both sides follow" className="md:col-span-2">
                    <StaticChipSelect
                      options={getOperationalGuardrailOptions(form.commercialModel)}
                      value={splitList(form.additionalNotes)}
                      onChange={(values) => update("additionalNotes", values.join(", "))}
                      placeholder="Search guardrail..."
                      emptyText="No guardrail found."
                      helper="Select the controls the GSA must respect. These are stored in the tender and shown to applicants."
                    />
                  </Field>
                </div>
              )}

              {step === 4 && <TenderPreview preview={preview} />}

              {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

              <div className="flex flex-col gap-3 border-t border-border-ui pt-5 sm:flex-row sm:justify-between">
                <Button variant="outline" disabled={step === 0 || Boolean(saving)} onClick={() => setStep((current) => Math.max(0, current - 1) as WizardStep)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {step === 4 ? (
                    <>
                      <Button variant="outline" disabled={Boolean(saving) || !form.title.trim()} onClick={() => submit("draft")}>
                        {saving === "draft" ? "Saving..." : "Save Draft"}
                      </Button>
                      <Button disabled={Boolean(saving) || !form.title.trim()} onClick={() => submit("open")}>
                        <Send className="h-4 w-4" />
                        {saving === "publish" ? "Publishing..." : "Publish Tender"}
                      </Button>
                    </>
                  ) : (
                    <Button disabled={!canContinue} onClick={() => setStep((current) => Math.min(4, current + 1) as WizardStep)}>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );

  function update(field: keyof TenderWizardForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateMandateType(value: string) {
    const suggestedCoverage = getSuggestedCoverageForMandate(value);
    setForm((current) => ({
      ...current,
      mandateType: value,
      coverageModel: suggestedCoverage ?? current.coverageModel,
    }));
  }

  function updateCoverageModel(value: string) {
    setForm((current) => ({ ...current, coverageModel: value }));
  }

  function updateCommercialModel(value: string) {
    setForm((current) => ({
      ...current,
      commercialModel: value,
      commissionRate: value === "capacity-risk" ? "" : current.commissionRate,
      monthlyRevenueTarget: value === "commission" ? "" : current.monthlyRevenueTarget,
      salesExpectations: "",
      additionalNotes: "",
    }));
  }

  function clearTenderBuilderDraft() {
    window.localStorage.removeItem(draftStorageKey);
    setLastSavedAt(null);
  }

  function startFresh() {
    clearTenderBuilderDraft();
    setForm(initialForm);
    setStep(0);
    setShowOptionalLocationDetails(false);
  }
}

function TenderPreview({ preview }: { preview: ReturnType<typeof buildPreview> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-ui bg-surface">
      <div className="border-b border-border-ui bg-surface2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{preview.airlineName}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{preview.title || "Untitled tender"}</h2>
        <p className="mt-2 text-sm text-ink-muted">{preview.region || "Market not set"} - {preview.airports || "Airports not set"}</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <PreviewMetric label="Mandate type" value={preview.mandateType || "Not set"} />
        <PreviewMetric label="Coverage model" value={preview.coverageModel || "Not set"} />
        <PreviewMetric label="Cargo focus" value={preview.cargoTypes || "Not set"} />
        <PreviewMetric label="Monthly tonnage" value={preview.monthlyTonnage || "Not set"} />
        <PreviewMetric label="Target load factor" value={preview.targetLoadFactor || "Not set"} />
        <PreviewMetric label="Contract duration" value={preview.contractDuration || "Not set"} />
      </div>
      {preview.routes.length > 0 && (
        <div className="border-t border-border-ui p-5">
          <p className="mb-3 text-sm font-semibold text-ink">Route lanes</p>
          <div className="grid gap-2 md:grid-cols-2">
            {preview.routes.map((route) => (
              <div key={route.id} className="rounded-xl border border-border-ui bg-surface2 px-4 py-3">
                <p className="font-mono text-sm font-bold text-ink">
                  {route.origin} → {route.destination}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {route.frequencyPerWeek}x / week
                  {route.operatingDays.length > 0 ? ` · ${route.operatingDays.join(", ")}` : ""}
                  {route.aircraft ? ` · ${route.aircraft}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 border-t border-border-ui p-5 lg:grid-cols-3">
        <PreviewBlock title="Mandatory requirements" value={preview.requirements || "No mandatory requirements entered."} />
        <PreviewBlock title="Commercial expectations" value={preview.salesExpectations || "No commercial expectations entered."} />
        <PreviewBlock title="Tender intelligence summary" value={preview.intelligenceSummary} />
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function PreviewBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{value}</p>
    </div>
  );
}

function OptionCardSelect({
  options,
  value,
  onChange,
}: {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-w-0 rounded-xl border px-4 py-3 text-left transition ${
              active
                ? "border-brand bg-brand-light text-brand"
                : "border-border-ui bg-surface2 text-ink hover:border-brand/40 hover:bg-brand-light"
            }`}
          >
            <span className={`block break-words text-sm font-semibold [overflow-wrap:anywhere] ${active ? "text-brand" : "text-ink"}`}>{option.label}</span>
            <span className="mt-1 block break-words text-xs leading-5 text-ink-muted [overflow-wrap:anywhere]">{option.meta}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScopeGuidance({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3 rounded-xl border border-border-ui bg-surface2 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{body}</p>
    </div>
  );
}

function ScopeChecklist({ coverageModel }: { coverageModel: string }) {
  const items = getScopeChecklist(coverageModel);
  return (
    <div className="grid gap-2 rounded-xl border border-border-ui bg-surface2 p-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border-ui bg-surface px-3 py-2">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${item.required ? "text-brand" : "text-ink-muted"}`}>
            {item.required ? "Required" : "Optional"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{item.helper}</p>
        </div>
      ))}
    </div>
  );
}

function CommercialChecklist({ commercialModel }: { commercialModel: string }) {
  const items = getCommercialChecklist(commercialModel);
  return (
    <div className="grid gap-2 rounded-xl border border-border-ui bg-surface2 p-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border-ui bg-surface px-3 py-2">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${item.required ? "text-brand" : "text-ink-muted"}`}>
            {item.required ? "Required" : "Optional"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{item.helper}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineExplainer() {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 px-4 py-3 md:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">How timing is evaluated</p>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        The airline sets the target contract start here. Each GSA later states its launch readiness after award, for example
        2 or 6 weeks from award. During evaluation, the platform can compare both signals instead of treating them as the
        same date.
      </p>
    </div>
  );
}

function RouteLaneBuilder({
  routes,
  required = false,
  helper,
  onChange,
}: {
  routes: TenderRouteDraft[];
  required?: boolean;
  helper?: string;
  onChange: (routes: TenderRouteDraft[]) => void;
}) {
  const [draft, setDraft] = useState<TenderRouteDraft>({ ...emptyRouteDraft });
  const canAddRoute = /^[A-Z]{3}$/.test(draft.origin) && /^[A-Z]{3}$/.test(draft.destination) && draft.origin !== draft.destination;

  function updateDraft(field: keyof TenderRouteDraft, value: string | string[]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addRoute() {
    if (!canAddRoute) return;
    const normalized: TenderRouteDraft = {
      ...draft,
      id: `${draft.origin}-${draft.destination}`,
      origin: draft.origin.toUpperCase(),
      destination: draft.destination.toUpperCase(),
      frequencyPerWeek: draft.frequencyPerWeek || "1",
      operatingDays: draft.operatingDays.length ? draft.operatingDays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
      aircraft: draft.aircraft.trim().toUpperCase(),
    };
    onChange([...routes.filter((route) => route.id !== normalized.id), normalized]);
    setDraft({ ...emptyRouteDraft });
  }

  function removeRoute(routeId: string) {
    onChange(routes.filter((route) => route.id !== routeId));
  }

  return (
    <div className="rounded-xl border border-border-ui bg-surface p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_1.1fr_140px_auto]">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Origin</p>
          <AirportCodePicker value={draft.origin} onChange={(value) => updateDraft("origin", value)} placeholder="Search origin..." />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Destination</p>
          <AirportCodePicker value={draft.destination} onChange={(value) => updateDraft("destination", value)} placeholder="Search destination..." />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Freq / week</p>
          <Input
            value={draft.frequencyPerWeek}
            onChange={(event) => updateDraft("frequencyPerWeek", event.target.value)}
            type="number"
            min={1}
            max={21}
            placeholder="1"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Operating days</p>
          <div className="grid grid-cols-7 gap-1">
            {weekdayOptions.map((day) => {
              const active = draft.operatingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? draft.operatingDays.filter((item) => item !== day.value)
                      : [...draft.operatingDays, day.value];
                    updateDraft("operatingDays", weekdayOptions.filter((item) => next.includes(item.value)).map((item) => item.value));
                  }}
                  className={`h-10 rounded-lg border text-xs font-bold transition ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-border-ui bg-surface2 text-ink-muted hover:border-brand/40 hover:text-brand"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Aircraft</p>
          <Select
            value={draft.aircraft}
            onChange={(event) => updateDraft("aircraft", event.target.value)}
          >
            <option value="">Select A/C</option>
            {aircraftOptions.map((aircraft) => (
              <option key={aircraft} value={aircraft}>
                {aircraft}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" disabled={!canAddRoute} onClick={addRoute} className="h-10 w-full lg:w-auto">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {routes.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border-ui">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Frequency</th>
                  <th className="px-3 py-2">Operating days</th>
                  <th className="px-3 py-2">Aircraft</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {routes.map((route) => (
                  <tr key={route.id}>
                    <td className="px-3 py-3 font-mono font-bold text-ink">{route.origin} → {route.destination}</td>
                    <td className="px-3 py-3 text-ink-muted">{route.frequencyPerWeek}x / week</td>
                    <td className="px-3 py-3 text-ink-muted">{route.operatingDays.join(", ")}</td>
                    <td className="px-3 py-3 text-ink-muted">{route.aircraft || "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRoute(route.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/25 px-2 py-1 text-xs font-semibold text-danger transition hover:bg-danger-bg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-ui bg-surface2 px-3 py-4 text-sm text-ink-muted">
            {helper ?? (required
              ? "Add at least one concrete route lane. These routes are copied into the awarded GSA contract and become assignable after award."
              : "Optional, but recommended: add concrete route lanes now. These routes are copied into the awarded GSA contract and become assignable after award.")}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function SearchChipSelect({
  kind,
  value,
  onChange,
  placeholder,
  emptyText,
  coverageText,
}: {
  kind: "countries" | "airports";
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  emptyText: string;
  coverageText: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchOption[]>([]);
  const [preferredCountry, setPreferredCountry] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const selectedKey = value.join(",");
  const selectedOptions = value.map((item) => ({ value: item, label: item, meta: "Selected" }));

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      kind,
      q: query.trim(),
      selected: selectedKey,
    });
    setLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/reference/locations?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as { options?: SearchOption[]; preferredCountry?: string };
        setResults(data.options ?? []);
        setPreferredCountry(data.preferredCountry);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [kind, query, selectedKey]);

  function addOption(option: SearchOption) {
    if (value.some((item) => item.toLowerCase() === option.value.toLowerCase())) return;
    onChange([...value, option.value]);
    setQuery("");
  }

  function removeOption(optionValue: string) {
    onChange(value.filter((item) => item.toLowerCase() !== optionValue.toLowerCase()));
  }

  return (
    <div className="rounded-xl border border-border-ui bg-surface p-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
      {selectedOptions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => removeOption(option.value)}
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand/40"
              title={`Remove ${option.label}`}
            >
              <span>{option.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (results[0]) addOption(results[0]);
            }
            if (event.key === "Backspace" && !query && value.length > 0) {
              removeOption(value[value.length - 1]);
            }
          }}
          className="h-10 w-full rounded-lg border border-border-ui bg-surface2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted"
          placeholder={placeholder}
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {loading ? (
          <p className="rounded-lg border border-dashed border-border-ui bg-surface2 px-3 py-4 text-sm text-ink-muted sm:col-span-2">Loading suggestions...</p>
        ) : results.length > 0 ? (
          results.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => addOption(option)}
              className="min-h-14 rounded-lg border border-border-ui bg-surface2 px-3 py-2 text-left transition hover:border-brand/40 hover:bg-brand-light"
            >
              <span className="block text-sm font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-4 text-ink-muted">{option.meta}</span>
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border-ui bg-surface2 px-3 py-4 text-sm text-ink-muted sm:col-span-2">{emptyText}</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        {preferredCountry ? `Suggestions start with ${preferredCountry}. ${coverageText}` : coverageText}
      </p>
    </div>
  );
}

function StaticChipSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  helper,
  search = "auto",
  searchThreshold = 18,
}: {
  options: SearchOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  emptyText: string;
  helper: string;
  search?: "auto" | "always" | "never";
  searchThreshold?: number;
}) {
  const [query, setQuery] = useState("");
  const showSearch = search === "always" || (search === "auto" && options.length > searchThreshold);
  const selectedSet = useMemo(() => new Set(value.map((item) => item.toLowerCase())), [value]);
  const selectedOptions = value.map((item) => options.find((option) => option.value.toLowerCase() === item.toLowerCase()) ?? { value: item, label: item, meta: "Selected" });
  const results = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!showSearch) return options;
    return options
      .filter((option) => !normalizedQuery || normalizeSearch(`${option.label} ${option.meta}`).includes(normalizedQuery));
  }, [options, query, showSearch]);

  function addOption(option: SearchOption) {
    if (selectedSet.has(option.value.toLowerCase())) return;
    onChange([...value, option.value]);
    setQuery("");
  }

  function removeOption(optionValue: string) {
    onChange(value.filter((item) => item.toLowerCase() !== optionValue.toLowerCase()));
  }

  function toggleOption(option: SearchOption) {
    if (selectedSet.has(option.value.toLowerCase())) {
      removeOption(option.value);
      return;
    }
    addOption(option);
  }

  return (
    <div className="rounded-xl border border-border-ui bg-surface p-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
      {showSearch && selectedOptions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => removeOption(option.value)}
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand/40"
              title={`Remove ${option.label}`}
            >
              <span>{option.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      {showSearch && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (results[0]) addOption(results[0]);
              }
              if (event.key === "Backspace" && !query && value.length > 0) {
                removeOption(value[value.length - 1]);
              }
            }}
            className="h-10 w-full rounded-lg border border-border-ui bg-surface2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted"
            placeholder={placeholder}
          />
        </div>
      )}
      <div className={`${showSearch ? "mt-3" : ""} grid gap-2`} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {results.length > 0 ? (
          results.map((option) => {
            const active = selectedSet.has(option.value.toLowerCase());
            const Icon = option.Icon ?? Package;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option)}
                className={`min-h-[78px] min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-brand bg-brand-light text-brand"
                    : "border-border-ui bg-surface2 text-ink hover:border-brand/40 hover:bg-brand-light"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? "bg-brand text-white" : "bg-surface text-brand"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 max-w-full">
                    <span className={`block break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere] ${active ? "text-brand" : "text-ink"}`}>{option.label}</span>
                    <span className="mt-0.5 block break-words text-xs leading-4 text-ink-muted [overflow-wrap:anywhere]">{option.meta}</span>
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-border-ui bg-surface2 px-3 py-4 text-sm text-ink-muted sm:col-span-3 xl:col-span-5">{emptyText}</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-muted">{helper}</p>
    </div>
  );
}

function buildPreview(form: TenderWizardForm, airlineName: string) {
  const monthlyTonnage = form.expectedMonthlyTonnage ? `${Number(form.expectedMonthlyTonnage).toLocaleString()} tons` : "";
  const intelligenceSummary = `${airlineName} is preparing a ${getOptionLabel(mandateTypeOptions, form.mandateType) || "GSA"} tender for ${form.region || "the selected market"}. The scope is ${getOptionLabel(coverageModelOptions, form.coverageModel) || "market-led"} and focuses on ${form.cargoTypes || "defined cargo products"} with ${monthlyTonnage || "a target monthly tonnage to be confirmed"}. Applicants should prove market coverage, sales execution, reporting discipline, and launch readiness before award.`;
  return {
    airlineName,
    title: form.title,
    region: form.region,
    airports: form.airports,
    routes: form.routes,
    mandateType: getOptionLabel(mandateTypeOptions, form.mandateType),
    coverageModel: getOptionLabel(coverageModelOptions, form.coverageModel),
    cargoTypes: form.cargoTypes,
    monthlyTonnage,
    targetLoadFactor: form.targetLoadFactor ? `${form.targetLoadFactor}%` : "",
    contractDuration: form.contractDuration,
    requirements: [form.requiredCapabilities, form.requiredExperience, form.requiredCertifications].filter(Boolean).join("\n"),
    salesExpectations: [
      form.commercialModel ? `Commercial model: ${getOptionLabel(commercialModelOptions, form.commercialModel) || form.commercialModel}` : "",
      form.commissionRate ? `Target commission: ${form.commissionRate}%` : "",
      form.monthlyRevenueTarget ? `Monthly revenue commitment: ${Number(form.monthlyRevenueTarget).toLocaleString()}` : "",
      form.reportingCadence ? `Reporting: ${getReportingCadenceLabel(form.reportingCadence)}` : "",
      form.salesExpectations,
      form.additionalNotes,
    ].filter(Boolean).join("\n\n"),
    intelligenceSummary,
  };
}

function getStepValidity(step: WizardStep, form: TenderWizardForm) {
  if (step === 0) {
    const routeLedReady = form.coverageModel !== "route-led" || form.routes.length > 0;
    const airportLedReady = form.coverageModel !== "airport-led" || Boolean(form.airports.trim() || form.routes.length > 0);
    return Boolean(form.title.trim() && form.region.trim() && form.mandateType && form.coverageModel && routeLedReady && airportLedReady);
  }
  if (step === 1) return Boolean(form.cargoTypes.trim() && form.applicationDeadline && form.startDate && form.contractDuration);
  if (step === 2) return Boolean(form.requiredCapabilities.trim());
  if (step === 3) return getCommercialModelValidity(form);
  return true;
}

function getStepHelper(step: WizardStep) {
  if (step === 0) return "Choose what the GSA should own and where the mandate applies.";
  if (step === 1) return "Set cargo products, target volume, and the dates GSAs need to know.";
  if (step === 2) return "Pick the proof GSAs must show. Avoid long free-text requirements.";
  if (step === 3) return "Choose how the GSA is paid or measured, and which reporting controls matter.";
  return "Check the final mandate before saving or publishing.";
}

function getSuggestedCoverageForMandate(value: string) {
  if (value === "route-launch") return "route-led";
  if (value === "regional-cluster") return "regional-cluster";
  return "country-wide";
}

function getMandateGuidance(value: string) {
  if (value === "sales-only") {
    return "Use this when the GSA should focus on sales, account coverage, and pipeline discipline, while operations stay mostly with the airline or another handling setup.";
  }
  if (value === "route-launch") {
    return "Use this when the airline wants a partner to activate specific lanes. The wizard will ask for route lanes because the award and later route assignment depend on them.";
  }
  if (value === "product-specialist") {
    return "Use this when a cargo product matters more than generic market coverage, for example pharma, DG, e-commerce, perishables, valuables, or mail.";
  }
  if (value === "regional-cluster") {
    return "Use this when one GSA should cover several connected countries as one commercial region, such as DACH, Benelux, GCC, or Nordics.";
  }
  return "Use this for the normal airline-GSA setup: the partner owns sales representation, market coverage, reporting, and commercial execution for the selected market.";
}

function getCoverageGuidance(value: string) {
  if (value === "airport-led") {
    return "The GSA mandate is anchored around specific airports or cities. Airport selection becomes required; route lanes stay optional unless you want to be more precise.";
  }
  if (value === "route-led") {
    return "The GSA mandate is tied to concrete origin-destination lanes. Route lanes become required and later become contract routes after the award.";
  }
  if (value === "regional-cluster") {
    return "The GSA mandate covers several related countries as one cluster. Countries are required; airport and route details are optional.";
  }
  return "The GSA mandate covers the selected country or market nationally. Countries are required; airport and route details are optional.";
}

function getCommercialModelValidity(form: TenderWizardForm) {
  const hasRequirements = Boolean(form.salesExpectations.trim());
  const hasReporting = Boolean(form.reportingCadence);
  if (form.commercialModel === "capacity-risk") {
    return Boolean(form.monthlyRevenueTarget.trim() && hasRequirements && hasReporting);
  }
  if (form.commercialModel === "hybrid") {
    return Boolean(form.commissionRate.trim() && form.monthlyRevenueTarget.trim() && hasRequirements && hasReporting);
  }
  return Boolean(form.commissionRate.trim() && hasRequirements && hasReporting);
}

function getCommercialModelCopy(value: string) {
  if (value === "capacity-risk") {
    return {
      guidance: "Use this when the airline wants the GSA to be accountable for filling committed capacity, not only quoting a commission. The money field below is a monthly revenue commitment in the contract currency. Tonnage and load factor are already defined in Cargo Focus.",
      commissionLabel: "commission target",
      commissionPlaceholder: "Not used",
      commissionHelper: "",
      revenueLabel: "monthly revenue commitment (contract currency)",
      revenuePlaceholder: "250000",
      revenueHelper: "Enter a money amount in the tender contract currency, for example 250000. This is not tons; monthly tonnage and load factor are set in Step 2.",
      requirementsHelper: "Select the commitments the GSA must prove. This replaces vague free-text expectations.",
    };
  }
  if (value === "hybrid") {
    return {
      guidance: "Use this when the airline wants a normal base commission plus measurable upside for growth, load factor, yield, or launch performance.",
      commissionLabel: "base commission target %",
      commissionPlaceholder: "4",
      commissionHelper: "Required. This is the base commission level GSAs should bid against.",
      revenueLabel: "monthly upside target (contract currency)",
      revenuePlaceholder: "250000",
      revenueHelper: "Enter the monthly money benchmark used for bonus or upside evaluation. Tonnage and load factor remain separate operational targets.",
      requirementsHelper: "Select both commission and performance expectations so GSAs know how upside is evaluated.",
    };
  }
  return {
    guidance: "Use this for standard GSA representation where the airline compares commission, sales coverage, reporting discipline, and launch readiness.",
    commissionLabel: "target commission %",
    commissionPlaceholder: "5",
    commissionHelper: "Required. GSAs can bid against this target in their application.",
    revenueLabel: "monthly revenue target (contract currency)",
    revenuePlaceholder: "250000",
    revenueHelper: "Optional money benchmark in the tender contract currency. Leave empty if commission is the only commercial comparison.",
    requirementsHelper: "Select the sales and reporting obligations the GSA must include in its proposal.",
  };
}

function getCommercialChecklist(commercialModel: string) {
  if (commercialModel === "capacity-risk") {
    return [
      { label: "Monthly revenue commitment", helper: "Money target in contract currency.", required: true },
      { label: "Capacity controls", helper: "Defines how shortfall and yield are managed.", required: true },
      { label: "Commission", helper: "Usually not the main decision driver.", required: false },
    ];
  }
  if (commercialModel === "hybrid") {
    return [
      { label: "Base commission", helper: "The floor commercial term.", required: true },
      { label: "Performance target", helper: "Defines upside trigger or growth benchmark.", required: true },
      { label: "Reporting cadence", helper: "Keeps incentive review measurable.", required: true },
    ];
  }
  return [
    { label: "Commission target", helper: "The baseline commercial bid.", required: true },
    { label: "Sales obligations", helper: "Defines what the GSA must prove.", required: true },
    { label: "Revenue target", helper: "Useful, but optional for pure commission.", required: false },
  ];
}

function getCommercialRequirementOptions(commercialModel: string): SearchOption[] {
  const shared = [
    { value: "Named top-account coverage plan", label: "Named account coverage", meta: "GSA must identify target forwarders and owner for each account" },
    { value: "Weekly pipeline and quote reporting", label: "Pipeline reporting", meta: "Structured quote, booking, lost-business, and next-action reporting" },
    { value: "First 90-day launch plan", label: "90-day launch plan", meta: "GSA must show the first activation milestones after award" },
    { value: "Monthly business review pack", label: "Monthly review pack", meta: "Revenue, tonnage, yield, pipeline, and issue log review" },
  ];
  if (commercialModel === "capacity-risk") {
    return [
      ...shared,
      { value: "Minimum monthly revenue commitment", label: "Revenue commitment", meta: "GSA must explain how it will reach the monthly target" },
      { value: "Load factor recovery plan", label: "Load factor recovery", meta: "Plan required when flown load factor misses target" },
      { value: "Yield protection by lane", label: "Yield protection", meta: "GSA must protect pricing discipline on priority lanes" },
      { value: "Unsold capacity escalation process", label: "Unsold capacity escalation", meta: "Clear escalation before capacity leaves underfilled" },
    ];
  }
  if (commercialModel === "hybrid") {
    return [
      ...shared,
      { value: "Base commission plus target incentive", label: "Base + incentive", meta: "GSA must separate base commission from performance upside" },
      { value: "Volume accelerator threshold", label: "Volume accelerator", meta: "Upside only after defined tonnage or revenue threshold" },
      { value: "Yield or load factor bonus trigger", label: "Yield / load bonus", meta: "Bonus tied to profitable growth, not only volume" },
      { value: "Quarterly incentive reconciliation", label: "Incentive reconciliation", meta: "Clear review period for bonus calculation" },
    ];
  }
  return [
    ...shared,
    { value: "Net-net commission proposal", label: "Net-net commission", meta: "GSA must quote commission on a clear revenue basis" },
    { value: "Forwarder account visit cadence", label: "Visit cadence", meta: "Minimum account contact rhythm for sales coverage" },
    { value: "Lost-business reason reporting", label: "Lost-business reporting", meta: "GSA must capture why quotes do not convert" },
    { value: "Sales forecast by month", label: "Monthly sales forecast", meta: "Forecast expected tonnage and revenue by month" },
  ];
}

function getOperationalGuardrailOptions(commercialModel: string): SearchOption[] {
  const shared = [
    { value: "No off-platform contract amendments", label: "No off-platform amendments", meta: "Commercial changes must be logged before they take effect" },
    { value: "Airline approval required for strategic accounts", label: "Strategic account approval", meta: "Named global accounts cannot be repriced without airline approval" },
    { value: "Weekly issue and exception log", label: "Exception log", meta: "Operational blockers are visible to both sides" },
    { value: "Customer response SLA defined", label: "Response SLA", meta: "GSA must commit to a customer response window" },
  ];
  if (commercialModel === "capacity-risk") {
    return [
      ...shared,
      { value: "Capacity shortfall escalation within 48 hours", label: "48h shortfall escalation", meta: "Escalate when bookings trail target capacity" },
      { value: "Rate floor approval required", label: "Rate floor approval", meta: "Protect yield before discounting capacity" },
      { value: "Peak-season allocation review", label: "Peak allocation review", meta: "Capacity plans reviewed before peak windows" },
    ];
  }
  if (commercialModel === "hybrid") {
    return [
      ...shared,
      { value: "Bonus only on collected revenue", label: "Collected revenue only", meta: "Avoid incentive disputes from unpaid or cancelled shipments" },
      { value: "Incentive capped by yield compliance", label: "Yield-compliant bonus", meta: "No bonus when growth damages yield targets" },
      { value: "Quarterly target reset option", label: "Quarterly reset option", meta: "Targets can be adjusted by agreed steering review" },
    ];
  }
  return [
    ...shared,
    { value: "Commission basis must exclude pass-through charges", label: "Exclude pass-through charges", meta: "Commission calculation should avoid tax/surcharge ambiguity" },
    { value: "Commission payable after flown and collected revenue", label: "Flown and collected revenue", meta: "Payment trigger is clear before award" },
    { value: "Conflict-of-interest declaration required", label: "Conflict declaration", meta: "GSA discloses competitor representation risks" },
  ];
}

function getMarketScopeCopy(coverageModel: string) {
  if (coverageModel === "airport-led") {
    return {
      label: "Market country",
      placeholder: "Search the country where these airports sit...",
      coverageText: "Select the country first, then choose the airport cities below. Search covers all countries.",
    };
  }
  if (coverageModel === "route-led") {
    return {
      label: "Route market context",
      placeholder: "Search origin, destination, or sales market country...",
      coverageText: "Select the countries connected to the route scope. Route lanes below define the actual mandate.",
    };
  }
  if (coverageModel === "regional-cluster") {
    return {
      label: "Regional market cluster",
      placeholder: "Search countries in this cluster...",
      coverageText: "Select every country covered by this regional mandate. Neighboring countries are suggested first.",
    };
  }
  return {
    label: "Market country",
    placeholder: "Search country or market...",
    coverageText: "Select the country the GSA should own. Neighboring countries are suggested first; search covers all countries.",
  };
}

function getOptionalLocationCopy(coverageModel: string) {
  if (coverageModel === "regional-cluster") {
    return {
      showLabel: "Add optional hub airports or route lanes",
      hideLabel: "Hide optional hub airports and route lanes",
      helper: "Regional mandates can be defined by countries alone. Add hubs or lanes only when the cluster has important focus points.",
    };
  }
  return {
    showLabel: "Add optional airports or route lanes",
    hideLabel: "Hide optional airport and route detail",
    helper: "Country-wide mandates can be defined by market country alone. Add airport or route detail only when it helps GSAs understand the commercial focus.",
  };
}

function getScopeChecklist(coverageModel: string) {
  if (coverageModel === "airport-led") {
    return [
      { label: "Market country", helper: "Sets the commercial jurisdiction.", required: true },
      { label: "Key airports", helper: "Defines the airport cities the GSA must cover.", required: true },
      { label: "Route lanes", helper: "Use only when specific lanes matter.", required: false },
    ];
  }
  if (coverageModel === "route-led") {
    return [
      { label: "Market context", helper: "Keeps the tender searchable by country.", required: true },
      { label: "Route lanes", helper: "Defines the exact mandate and later contract routes.", required: true },
      { label: "Key airports", helper: "Inferred from route lanes unless extra context is needed.", required: false },
    ];
  }
  if (coverageModel === "regional-cluster") {
    return [
      { label: "Cluster countries", helper: "Every country in the mandate scope.", required: true },
      { label: "Hub airports", helper: "Useful for focus hubs, not mandatory.", required: false },
      { label: "Route lanes", helper: "Useful for launch lanes, not mandatory.", required: false },
    ];
  }
  return [
    { label: "Market country", helper: "The country the GSA should represent.", required: true },
    { label: "Key airports", helper: "Optional focus airports or cities.", required: false },
    { label: "Route lanes", helper: "Optional lanes for known opportunities.", required: false },
  ];
}

function getOptionLabel(options: SearchOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function getReportingCadenceLabel(value: string) {
  if (value === "biweekly") return "Biweekly pipeline review";
  if (value === "monthly") return "Monthly business review";
  if (value === "quarterly") return "Quarterly steering review";
  return "Weekly sales review";
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStoredForm(value: unknown): TenderWizardForm | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<TenderWizardForm> & { routes?: unknown };
  return {
    ...initialForm,
    ...stored,
    routes: normalizeStoredRoutes(stored.routes),
  };
}

function normalizeStoredRoutes(value: unknown): TenderRouteDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const route = item as Partial<TenderRouteDraft>;
    return [{
      id: typeof route.id === "string" ? route.id : `${route.origin ?? ""}-${route.destination ?? ""}`,
      origin: typeof route.origin === "string" ? route.origin : "",
      destination: typeof route.destination === "string" ? route.destination : "",
      frequencyPerWeek: typeof route.frequencyPerWeek === "string" ? route.frequencyPerWeek : "1",
      operatingDays: Array.isArray(route.operatingDays) ? route.operatingDays.filter((day): day is string => typeof day === "string") : [],
      aircraft: typeof route.aircraft === "string" ? route.aircraft : "",
    }];
  });
}

function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === "number" && value >= 0 && value <= 4 && Number.isInteger(value);
}

function slugifyStorageKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "airline";
}

function formatAutosaveTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cargoType(value: string, meta: string, Icon: SearchOption["Icon"]): SearchOption {
  return {
    value,
    label: value,
    meta,
    Icon,
  };
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
