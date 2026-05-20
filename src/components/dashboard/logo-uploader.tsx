"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Plane, Trash2, Upload } from "lucide-react";

export function LogoUploader({
  currentLogo,
  brandColor,
}: {
  currentLogo?: string;
  brandColor: string;
}) {
  const router = useRouter();
  const [logo, setLogo] = useState(currentLogo);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
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
        router.refresh();
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

  async function removeLogo() {
    setRemoving(true);
    setError(undefined);
    try {
      const res = await fetch("/api/airline/logo", { method: "DELETE" });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Remove failed");
        return;
      }
      setLogo(undefined);
      router.refresh();
    } catch {
      setError("Remove failed");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || removing}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-ui shadow-md transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/40"
        style={{ backgroundColor: logo ? "#ffffff" : brandColor }}
        title="Upload logo"
      >
        {logo ? (
          <Image
            src={logo}
            alt="Airline logo"
            fill
            className="object-contain p-2"
            unoptimized
          />
        ) : (
          <Plane className="h-10 w-10 text-white" />
        )}

        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading || removing ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <>
              <Upload className="h-4 w-4 text-white" />
              <span className="text-[9px] font-semibold text-white">Upload</span>
            </>
          )}
        </span>
      </button>

      {logo && (
        <button
          type="button"
          onClick={removeLogo}
          disabled={uploading || removing}
          className="inline-flex items-center gap-1 rounded-md border border-danger/25 px-2 py-1 text-[10px] font-semibold text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Remove
        </button>
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <p className="text-[10px] text-ink-muted">
        PNG, JPG or WebP - max 2 MB<br />Click logo to change
      </p>
    </div>
  );
}
