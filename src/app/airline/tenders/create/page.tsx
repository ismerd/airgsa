"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { FileDropzone, type DroppedFile } from "@/components/dashboard/file-dropzone";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CreateTenderPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);

  return (
    <>
      <Topbar title="Create tender" subtitle="Airline tender desk" />
      <main className="p-5">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>RFP brief</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Tender title" defaultValue="Central Europe GSA representation" />
            <Input placeholder="Expected annual tonnage" defaultValue="18400" />
            <Input placeholder="Markets" defaultValue="Germany, Austria, Switzerland" />
            <Input placeholder="Core lanes" defaultValue="FRA, MUC, VIE to DXB, DOH, SIN" />
            <Select defaultValue="open">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
            </Select>
            <Input placeholder="Deadline" defaultValue="2026-05-24" type="date" />
            <Textarea
              className="md:col-span-2"
              placeholder="Requirements"
              defaultValue={"GDP-certified pharma desk\n24/7 booking coverage\nMonthly route-level KPI reporting"}
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Commercial expectations"
              defaultValue="Target a GSA with strong DACH key account coverage, CASS process maturity, and launch support for pharma and express shippers."
            />

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-white">Attachments</p>
                {files.length > 0 && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                    {files.length}
                  </span>
                )}
              </div>
              <FileDropzone
                files={files}
                onChange={setFiles}
                hint="Route data, capacity sheets, commercial terms, maps — any supporting document"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
              <Button>
                Publish tender{files.length > 0 ? ` · ${files.length} attachment${files.length > 1 ? "s" : ""}` : ""}
              </Button>
              <Button variant="outline">Save draft</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
