"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenderWorkflowDocument } from "@/lib/services/tender-workflow-store";

type DocumentPreview = {
  name: string;
  mimeType: string;
  src: string;
  isImage: boolean;
};

type DocumentSource =
  | {
      available: true;
      href: string;
      downloadName: string;
      preview: DocumentPreview;
    }
  | {
      available: false;
      missingReason: string;
    };

export function DocumentList({ documents }: { documents: TenderWorkflowDocument[] }) {
  const [preview, setPreview] = useState<DocumentPreview | null>(null);

  if (documents.length === 0) {
    return <p className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">No documents attached.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((file) => {
          const source = getDocumentSource(file);

          return (
            <div key={file.id} className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
              <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-brand" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!source.available}
                onClick={() => source.available && setPreview(source.preview)}
                title={source.available ? "View document" : source.missingReason}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
              {source.available ? (
                <a href={source.href} download={source.downloadName} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border-ui bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface2">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              ) : (
                <Button type="button" size="sm" variant="ghost" disabled title={source.missingReason}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              )}
              </div>
              {!source.available && (
                <p className="mt-2 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                  {source.missingReason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-ui bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border-ui px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{preview.name}</p>
                <p className="text-xs text-ink-muted">{preview.mimeType}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="rounded-md p-2 text-ink-muted hover:bg-surface2 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-surface2">
              {preview.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.src} alt={preview.name} className="h-full w-full object-contain" />
              ) : (
                <iframe src={preview.src} title={preview.name} className="h-full w-full bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getDocumentSource(file: TenderWorkflowDocument): DocumentSource {
  const href = file.documentUrl ?? file.dataUrl;
  if (href) {
    return {
      available: true,
      href,
      downloadName: file.name,
      preview: {
        name: file.name,
        mimeType: file.mimeType,
        src: href,
        isImage: file.mimeType.startsWith("image/"),
      },
    };
  }

  return {
    available: false,
    missingReason: "This older application only stored the filename, not the original file. Re-upload the document to preview or download it here.",
  };
}
