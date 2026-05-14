"use client";

import { useCallback, useRef, useState } from "react";
import { File, FileSpreadsheet, FileText, ImageIcon, Upload, X } from "lucide-react";

export type DroppedFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
};

type Props = {
  files: DroppedFile[];
  onChange: (files: DroppedFile[]) => void;
  hint?: string;
};

function getIcon(mime: string) {
  if (mime === "application/pdf")
    return <FileText className="h-4 w-4 text-rose-400" />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
  if (mime.includes("word") || mime.includes("document"))
    return <FileText className="h-4 w-4 text-blue-400" />;
  if (mime.startsWith("image/"))
    return <ImageIcon className="h-4 w-4 text-violet-400" />;
  return <File className="h-4 w-4 text-ink-muted" />;
}

function getTypeLabel(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Excel";
  if (mime === "text/csv") return "CSV";
  if (mime.includes("word") || mime.includes("document")) return "Word";
  if (mime.startsWith("image/")) return mime.split("/")[1].toUpperCase();
  return "File";
}

function getTypeBadge(mime: string) {
  if (mime === "application/pdf") return "text-rose-300 bg-rose-500/10 border-rose-500/20";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
  if (mime.includes("word") || mime.includes("document"))
    return "text-blue-300 bg-blue-500/10 border-blue-500/20";
  if (mime.startsWith("image/"))
    return "text-violet-300 bg-violet-500/10 border-violet-500/20";
  return "text-ink bg-slate-500/10 border-slate-500/20";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({ files, onChange, hint }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const absorb = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    const existing = new Set(files.map((f) => f.name));
    const next: DroppedFile[] = await Promise.all(
      Array.from(incoming)
        .filter((f) => !existing.has(f.name))
        .map(async (f) => ({
          id: `${f.name}-${f.size}-${Math.random()}`,
          name: f.name,
          size: f.size,
          mimeType: f.type || "application/octet-stream",
          dataUrl: await readAsDataUrl(f),
        })),
    );
    if (next.length) onChange([...files, ...next]);
  }, [files, onChange]);

  function remove(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    absorb(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors select-none
          ${dragging
            ? "border-brand bg-brand-light text-brand"
            : "border-border-ui bg-surface text-ink-muted hover:border-border-ui hover:bg-surface2"
          }`}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${dragging ? "border-brand/40 bg-brand-light" : "border-border-ui bg-surface"}`}>
          <Upload className={`h-5 w-5 transition-colors ${dragging ? "text-brand" : "text-ink-muted"}`} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-semibold transition-colors ${dragging ? "text-brand" : "text-ink"}`}>
            {dragging ? "Drop files here" : "Drag & drop files, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {hint ?? "PDF, Word, Excel, CSV, images"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.ppt,.pptx"
          onChange={(e) => absorb(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-border-ui bg-surface2 px-4 py-3"
            >
              {getIcon(f.mimeType)}
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getTypeBadge(f.mimeType)}`}>
                {getTypeLabel(f.mimeType)}
              </span>
              <span className="shrink-0 text-xs text-ink-muted">{formatSize(f.size)}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(f.id); }}
                className="shrink-0 rounded p-0.5 text-ink-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
