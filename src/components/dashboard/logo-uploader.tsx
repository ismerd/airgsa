"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Loader2, Plane, Upload } from "lucide-react";

export function LogoUploader({
  currentLogo,
  brandColor,
}: {
  currentLogo?: string;
  brandColor: string;
}) {
  const [logo, setLogo] = useState(currentLogo);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(undefined);
    const fd = new FormData();
    fd.append("logo", file);
    try {
      const res = await fetch("/api/airline/logo", { method: "POST", body: fd });
      const data = await res.json() as { logoPath?: string; error?: string };
      if (data.logoPath) {
        setLogo(data.logoPath + "?v=" + Date.now());
      } else {
        setError(data.error ?? "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/40"
        style={{ backgroundColor: brandColor }}
        title="Upload logo"
      >
        {logo ? (
          <Image
            src={logo}
            alt="Airline logo"
            fill
            className="object-contain p-1"
            unoptimized
          />
        ) : (
          <Plane className="h-10 w-10 text-white" />
        )}

        {/* Hover overlay */}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <>
              <Upload className="h-4 w-4 text-white" />
              <span className="text-[9px] font-semibold text-white">Upload</span>
            </>
          )}
        </span>
      </button>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />

      <p className="text-[10px] text-ink-muted">
        PNG, JPG, SVG or WebP · max 2 MB<br />Click logo to change
      </p>
    </div>
  );
}
