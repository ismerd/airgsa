"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Camera, Loader2, Upload, UserCircle, XCircle } from "lucide-react";

type AssetKind = "logo" | "banner" | "avatar";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function HeroBannerUpload({
  currentPath,
  canManageBrand,
  uploadEndpoint = "/api/airline/profile/assets",
}: {
  currentPath?: string;
  canManageBrand: boolean;
  uploadEndpoint?: string;
}) {
  if (!canManageBrand) return null;

  return (
    <AssetAction kind="banner" currentPath={currentPath} uploadEndpoint={uploadEndpoint}>
      {({ input, path, busy, error, openPicker, remove }) => (
        <>
          {input}
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="absolute right-3 top-3 z-30 inline-flex h-9 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 text-xs font-bold text-white opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-black/45 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50 group-hover:opacity-100 disabled:cursor-wait disabled:opacity-60"
            aria-label="Upload airline banner"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{path ? "Change banner" : "Add banner"}</span>
          </button>
          {path && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="absolute right-3 top-14 z-30 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-black/45 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50 group-hover:opacity-100 disabled:opacity-50"
            >
              Remove banner
            </button>
          )}
          {error && (
            <p className="absolute bottom-4 left-4 z-20 rounded-full bg-danger-bg px-3 py-1.5 text-xs font-bold text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </AssetAction>
  );
}

export function HeroLogoUpload({
  currentPath,
  companyName,
  initials,
  canManageBrand,
  uploadEndpoint = "/api/airline/profile/assets",
}: {
  currentPath?: string;
  companyName: string;
  initials: string;
  canManageBrand: boolean;
  uploadEndpoint?: string;
}) {
  if (!canManageBrand) {
    return (
      <LogoFrame currentPath={currentPath} companyName={companyName} initials={initials} />
    );
  }

  return (
    <AssetAction kind="logo" currentPath={currentPath} uploadEndpoint={uploadEndpoint}>
      {({ input, path, busy, error, openPicker, remove }) => (
        <div className="group/logo relative shrink-0">
          {input}
          <button type="button" onClick={openPicker} disabled={busy} className="block focus:outline-none focus:ring-2 focus:ring-white/60">
            <LogoFrame currentPath={path} companyName={companyName} initials={initials} />
            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition group-hover/logo:opacity-100">
              {busy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
            </span>
          </button>
          {path && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-danger opacity-0 shadow-sm transition hover:bg-danger-bg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-danger/20 group-hover/logo:opacity-100"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {error && <p className="absolute left-0 top-full mt-2 whitespace-nowrap rounded-full bg-danger-bg px-2 py-1 text-[10px] font-bold text-danger">{error}</p>}
        </div>
      )}
    </AssetAction>
  );
}

export function AvatarAssetUploader({
  currentPath,
  uploadEndpoint = "/api/airline/profile/assets",
  variant = "card",
}: {
  currentPath?: string;
  uploadEndpoint?: string;
  variant?: "card" | "compact";
}) {
  if (variant === "compact") {
    return (
      <AssetAction kind="avatar" currentPath={currentPath} uploadEndpoint={uploadEndpoint}>
        {({ input, path, busy, error, openPicker, remove }) => (
          <div className="group relative shrink-0">
            {input}
            <button
              type="button"
              onClick={openPicker}
              disabled={busy}
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border-ui bg-brand-light text-brand shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
              aria-label="Change your photo"
            >
              {path ? (
                <Image src={path} alt="Your photo" fill className="object-cover" unoptimized />
              ) : (
                <UserCircle className="h-9 w-9" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                {busy ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
              </span>
            </button>
            {path && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-danger/25 bg-white text-danger opacity-0 shadow-sm transition hover:bg-danger-bg group-hover:opacity-100 disabled:opacity-50"
                aria-label="Remove your photo"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
            {error && <p className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-danger-bg px-2 py-1 text-xs font-semibold text-danger shadow-sm">{error}</p>}
          </div>
        )}
      </AssetAction>
    );
  }

  return (
    <AssetAction kind="avatar" currentPath={currentPath} uploadEndpoint={uploadEndpoint}>
      {({ input, path, busy, error, openPicker, remove }) => (
        <div className="flex items-center gap-4 rounded-xl border border-border-ui bg-surface2 p-4">
          {input}
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-ui bg-brand-light text-brand transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          >
            {path ? (
              <Image src={path} alt="Your photo" fill className="object-cover" unoptimized />
            ) : (
              <UserCircle className="h-10 w-10" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Your photo</p>
            <p className="mt-1 text-sm leading-5 text-ink-muted">Shown next to your personal account inside the workspace.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={openPicker} disabled={busy} className="rounded-lg border border-border-ui px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-60">
                Upload photo
              </button>
              {path && (
                <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-danger/25 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-bg disabled:opacity-60">
                  <XCircle className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
          </div>
        </div>
      )}
    </AssetAction>
  );
}

function LogoFrame({ currentPath, companyName, initials }: { currentPath?: string; companyName: string; initials: string }) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl text-3xl font-black shadow-xl ${
        currentPath ? "border border-white/30 bg-white" : "bg-white/20 backdrop-blur-sm"
      }`}
      style={{ height: "4.5rem", width: "4.5rem" }}
    >
      {currentPath ? (
        <Image src={currentPath} alt={`${companyName} logo`} fill className="object-contain p-2" unoptimized />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function AssetAction({
  kind,
  currentPath,
  uploadEndpoint,
  children,
}: {
  kind: AssetKind;
  currentPath?: string;
  uploadEndpoint: string;
  children: (state: {
    input: ReactNode;
    path?: string;
    busy: boolean;
    error?: string;
    openPicker: () => void;
    remove: () => void;
  }) => ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(currentPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const preparedFile = await prepareImageForUpload(file, kind);
      const body = new FormData();
      body.append("kind", kind);
      body.append("asset", preparedFile);
      const response = await fetch(uploadEndpoint, { method: "POST", body });
      const data = (await response.json()) as Record<string, string | undefined> & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      const nextPath = data.logoPath ?? data.bannerPath ?? data.avatarPath;
      setPath(nextPath ? `${nextPath}?v=${Date.now()}` : undefined);
      router.refresh();
    } catch {
      setError("Upload failed. Please use a smaller PNG, JPG, or WebP image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`${uploadEndpoint}?kind=${kind}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Remove failed.");
        return;
      }
      setPath(undefined);
      router.refresh();
    } catch {
      setError("Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(event) => upload(event.target.files?.[0])}
    />
  );

  return children({
    input,
    path,
    busy,
    error,
    openPicker: () => inputRef.current?.click(),
    remove,
  });
}

async function prepareImageForUpload(file: File, kind: AssetKind) {
  if (!file.type.startsWith("image/")) return file;

  const target = getImageTarget(kind);
  const bitmap = await createImageBitmap(file);
  const initialScale = Math.min(1, target.width / bitmap.width, target.height / bitmap.height);
  let width = Math.max(1, Math.round(bitmap.width * initialScale));
  let height = Math.max(1, Math.round(bitmap.height * initialScale));
  let quality = 0.86;

  if (file.size <= MAX_UPLOAD_BYTES && initialScale === 1) {
    bitmap.close();
    return file;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const blob = await renderCompressedImage(bitmap, width, height, quality);
    if (blob.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return new File([blob], renameImage(file.name), { type: blob.type, lastModified: Date.now() });
    }

    if (quality > 0.58) {
      quality -= 0.12;
    } else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }

  bitmap.close();
  throw new Error("Image could not be compressed below 2 MB.");
}

function getImageTarget(kind: AssetKind) {
  if (kind === "banner") return { width: 1920, height: 720 };
  if (kind === "logo") return { width: 640, height: 640 };
  return { width: 512, height: 512 };
}

async function renderCompressedImage(bitmap: ImageBitmap, width: number, height: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression is not available.");

  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Image compression failed.");
  return blob;
}

function renameImage(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "profile-image";
  return `${base}.webp`;
}
