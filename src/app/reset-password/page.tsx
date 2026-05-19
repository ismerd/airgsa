import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-5">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Choose your password</h1>
          <p className="mt-2 text-sm text-ink-muted">Use the secure link from your email to set or reset your password.</p>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface2" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
