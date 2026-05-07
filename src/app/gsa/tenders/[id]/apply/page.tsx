"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { FileDropzone, type DroppedFile } from "@/components/dashboard/file-dropzone";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const requiredDocs = [
  "Company certifications (IATA, GDP, ISO) — PDF",
  "Key account list — Excel or CSV",
  "Last 2 years financial summary — PDF",
  "Insurance certificate — PDF",
  "References / case studies (optional)",
];

export default function ApplyTenderPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);

  return (
    <>
      <Topbar title="Apply to tender" subtitle="GSA application" />
      <main className="p-5">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Commercial proposal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Proposed commission" defaultValue="5.8% base + 1.2% accelerator" />
            <Input placeholder="Launch timeline" defaultValue="90 days" />
            <Input placeholder="Named account coverage" defaultValue="84 active shipper relationships" />
            <Input placeholder="Monthly sales target" defaultValue="$1.4M" />
            <Textarea
              className="md:col-span-2"
              placeholder="Network plan"
              defaultValue="Dedicated DACH pharma and express desk with named key account owners for FRA, MUC, and VIE origin traffic."
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Operational readiness"
              defaultValue="GDP-certified process, CASS settlement experience, airline handover checklist, and 24/7 booking escalation coverage."
            />

            {/* Supporting documents */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-ink-muted" />
                <p className="text-sm font-semibold text-ink">Supporting documents</p>
                {files.length > 0 && (
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                    {files.length}
                  </span>
                )}
              </div>

              {/* What airlines typically expect */}
              <div className="rounded-lg border border-border-ui bg-surface px-4 py-3">
                <p className="text-xs font-semibold text-ink-muted mb-2">Commonly requested documents</p>
                <ul className="space-y-1">
                  {requiredDocs.map((doc) => (
                    <li key={doc} className="flex items-start gap-2 text-xs text-ink-muted">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>

              <FileDropzone
                files={files}
                onChange={setFiles}
                hint="Certifications, key account lists, financial summary, insurance, references"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
              <Button>
                Submit application{files.length > 0 ? ` · ${files.length} document${files.length > 1 ? "s" : ""}` : ""}
              </Button>
              <Button variant="outline">Save draft</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
