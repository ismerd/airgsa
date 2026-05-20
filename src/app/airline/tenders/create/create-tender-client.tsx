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
  Search,
  Send,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  Truck,
  X,
} from "lucide-react";
import { AiTextButton } from "@/components/ai/ai-text-button";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type WizardStep = 0 | 1 | 2 | 3 | 4;

type TenderWizardForm = {
  title: string;
  region: string;
  airports: string;
  cargoTypes: string;
  expectedMonthlyTonnage: string;
  contractDuration: string;
  applicationDeadline: string;
  startDate: string;
  requiredExperience: string;
  requiredCertifications: string;
  salesExpectations: string;
  additionalNotes: string;
};

type SearchOption = {
  value: string;
  label: string;
  meta: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

const steps = [
  { label: "Market", icon: Globe2 },
  { label: "Cargo Focus", icon: Package },
  { label: "Requirements", icon: ClipboardList },
  { label: "Commercial Expectations", icon: FileText },
  { label: "Review & Publish", icon: CheckCircle2 },
];

const initialForm: TenderWizardForm = {
  title: "",
  region: "",
  airports: "",
  cargoTypes: "",
  expectedMonthlyTonnage: "",
  contractDuration: "",
  applicationDeadline: "",
  startDate: "",
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
  cargoType("Express cargo", "Priority and time-critical shipments", Truck),
  cargoType("Live animals", "AVI shipments", PawPrint),
  cargoType("Valuables", "High-value cargo and secure handling", Gem),
  cargoType("Oversized cargo", "Heavy, outsized, or project cargo", Package),
  cargoType("Humanitarian cargo", "Relief, NGO, and emergency shipments", HeartPulse),
  cargoType("Mail", "Postal and mail traffic", Mail),
  cargoType("AOG", "Aircraft-on-ground urgent parts", Plane),
];

export function CreateTenderClient({ airlineName }: { airlineName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<TenderWizardForm>(initialForm);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => buildPreview(form, airlineName), [airlineName, form]);
  const canContinue = getStepValidity(step, form);

  async function submit(status: "draft" | "open") {
    setSaving(status === "open" ? "publish" : "draft");
    setError(null);

    try {
      const regions = splitList(form.region);
      const airports = splitList(form.airports).map((airport) => airport.toUpperCase());
      const requirements = [
        ...splitList(form.requiredExperience).map((item) => `Experience: ${item}`),
        ...splitList(form.requiredCertifications).map((item) => `Certification: ${item}`),
      ];
      const commercialExpectations = [
        form.salesExpectations,
        form.contractDuration ? `Contract duration: ${form.contractDuration}` : "",
        form.additionalNotes ? `Additional notes: ${form.additionalNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const monthly = Number(form.expectedMonthlyTonnage) || 0;

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
          commercialModel: "commission",
          requirements,
          commercialExpectations,
          routes: [],
          attachments: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Tender could not be saved");
        return;
      }

      const data = await res.json();
      router.push(`/airline/tenders/${data.tender.id}`);
    } catch {
      setError("Tender could not be saved. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Topbar title="Tender Builder" subtitle="Structured GSA tender wizard" />
      <main className="grid gap-5 p-5 xl:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Build workflow</CardTitle>
            <p className="text-sm text-ink-muted">Five steps from market scope to publish-ready preview.</p>
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
                  <Field label="title">
                    <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={`${airlineName} Central Europe representation`} />
                  </Field>
                  <Field label="market countries" className="md:col-span-2">
                    <SearchChipSelect
                      kind="countries"
                      value={splitList(form.region)}
                      onChange={(values) => update("region", values.join(", "))}
                      placeholder="Search country or market..."
                      emptyText="No market found."
                      coverageText="Neighboring countries are suggested first. Search covers all countries."
                    />
                  </Field>
                  <Field label="airports" className="md:col-span-2">
                    <SearchChipSelect
                      kind="airports"
                      value={splitList(form.airports)}
                      onChange={(values) => update("airports", values.join(", "))}
                      placeholder="Search by airport code, city, or airport name..."
                      emptyText="No airport found."
                      coverageText="Search covers 9,000+ IATA airports."
                    />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="cargo_types" className="md:col-span-2">
                    <StaticChipSelect
                      options={cargoTypeOptions}
                      value={splitList(form.cargoTypes)}
                      onChange={(values) => update("cargoTypes", values.join(", "))}
                      placeholder="Search cargo product or handling type..."
                      emptyText="No cargo type found."
                      helper="Select one or more cargo types covered by this GSA mandate."
                    />
                  </Field>
                  <Field label="expected_monthly_tonnage">
                    <Input value={form.expectedMonthlyTonnage} onChange={(event) => update("expectedMonthlyTonnage", event.target.value)} type="number" placeholder="1500" />
                  </Field>
                  <Field label="contract_duration">
                    <Input value={form.contractDuration} onChange={(event) => update("contractDuration", event.target.value)} placeholder="24 months with 12-month extension option" />
                  </Field>
                  <Field label="application_deadline">
                    <Input value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} type="date" />
                  </Field>
                  <Field label="start_date">
                    <Input value={form.startDate} onChange={(event) => update("startDate", event.target.value)} type="date" />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="required_experience" className="md:col-span-2">
                    <Textarea className="pr-32 pt-10" value={form.requiredExperience} onChange={(event) => update("requiredExperience", event.target.value)} placeholder="10+ years cargo sales in France&#10;Existing Tier-1 forwarder relationships&#10;Airport sales presence at CDG" />
                    <AiTextButton
                      value={form.requiredExperience}
                      onChange={(value) => update("requiredExperience", value)}
                      fieldLabel="Tender required experience"
                      context={buildAiContext(form)}
                    />
                  </Field>
                  <Field label="required_certifications" className="md:col-span-2">
                    <Textarea className="pr-32 pt-10" value={form.requiredCertifications} onChange={(event) => update("requiredCertifications", event.target.value)} placeholder="IATA CASS&#10;GDP pharma handling&#10;ISO 9001 preferred" />
                    <AiTextButton
                      value={form.requiredCertifications}
                      onChange={(value) => update("requiredCertifications", value)}
                      fieldLabel="Tender required certifications"
                      context={buildAiContext(form)}
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <Field label="sales_expectations">
                    <Textarea className="pr-32 pt-10" value={form.salesExpectations} onChange={(event) => update("salesExpectations", event.target.value)} placeholder="Monthly sales target, account coverage, reporting rhythm, commercial proposal expectations..." />
                    <AiTextButton
                      value={form.salesExpectations}
                      onChange={(value) => update("salesExpectations", value)}
                      fieldLabel="Tender sales expectations"
                      context={buildAiContext(form)}
                    />
                  </Field>
                  <Field label="additional_notes">
                    <Textarea className="pr-32 pt-10" value={form.additionalNotes} onChange={(event) => update("additionalNotes", event.target.value)} placeholder="Operational constraints, preferred launch plan, special cargo requirements..." />
                    <AiTextButton
                      value={form.additionalNotes}
                      onChange={(value) => update("additionalNotes", value)}
                      fieldLabel="Tender additional notes"
                      context={buildAiContext(form)}
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
        <PreviewMetric label="Cargo focus" value={preview.cargoTypes || "Not set"} />
        <PreviewMetric label="Monthly tonnage" value={preview.monthlyTonnage || "Not set"} />
        <PreviewMetric label="Contract duration" value={preview.contractDuration || "Not set"} />
      </div>
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
}: {
  options: SearchOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  emptyText: string;
  helper: string;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(value.map((item) => item.toLowerCase())), [value]);
  const selectedOptions = value.map((item) => options.find((option) => option.value.toLowerCase() === item.toLowerCase()) ?? { value: item, label: item, meta: "Selected" });
  const results = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return options
      .filter((option) => !normalizedQuery || normalizeSearch(`${option.label} ${option.meta}`).includes(normalizedQuery));
  }, [options, query]);

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
      <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {results.length > 0 ? (
          results.map((option) => {
            const active = selectedSet.has(option.value.toLowerCase());
            const Icon = option.Icon ?? Package;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option)}
                className={`min-h-[78px] rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-brand bg-brand-light text-brand"
                    : "border-border-ui bg-surface2 text-ink hover:border-brand/40 hover:bg-brand-light"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? "bg-brand text-white" : "bg-surface text-brand"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold leading-5 ${active ? "text-brand" : "text-ink"}`}>{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-ink-muted">{option.meta}</span>
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
  const intelligenceSummary = `${airlineName} is preparing a GSA tender for ${form.region || "the selected market"}. The mandate focuses on ${form.cargoTypes || "defined cargo products"} with ${monthlyTonnage || "a target monthly tonnage to be confirmed"}. Applicants should prove market coverage, airport access, sales execution, and launch readiness before award.`;
  return {
    airlineName,
    title: form.title,
    region: form.region,
    airports: form.airports,
    cargoTypes: form.cargoTypes,
    monthlyTonnage,
    contractDuration: form.contractDuration,
    requirements: [form.requiredExperience, form.requiredCertifications].filter(Boolean).join("\n"),
    salesExpectations: [form.salesExpectations, form.additionalNotes].filter(Boolean).join("\n\n"),
    intelligenceSummary,
  };
}

function getStepValidity(step: WizardStep, form: TenderWizardForm) {
  if (step === 0) return Boolean(form.title.trim() && form.region.trim());
  if (step === 1) return Boolean(form.cargoTypes.trim() && form.applicationDeadline && form.startDate);
  return true;
}

function getStepHelper(step: WizardStep) {
  if (step === 0) return "Define where this GSA mandate applies and which airports matter.";
  if (step === 1) return "Set the cargo profile, monthly tonnage target, and tender timeline.";
  if (step === 2) return "Separate must-have experience and certifications from general context.";
  if (step === 3) return "Tell GSAs what a strong commercial and sales plan should prove.";
  return "Review the tender exactly as an airline team would see it before publication.";
}

function buildAiContext(form: TenderWizardForm) {
  return [
    form.title ? `Tender title: ${form.title}` : "",
    form.region ? `Region: ${form.region}` : "",
    form.airports ? `Airports: ${form.airports}` : "",
    form.cargoTypes ? `Cargo focus: ${form.cargoTypes}` : "",
    form.expectedMonthlyTonnage ? `Expected monthly tonnage: ${form.expectedMonthlyTonnage}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
