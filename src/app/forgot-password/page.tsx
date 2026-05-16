import Link from "next/link";
import { Suspense } from "react";
import { ForgotPasswordForm } from "./password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-5">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Reset your password</h1>
          <p className="mt-2 text-sm text-ink-muted">Enter your account email and we will send a secure reset link.</p>
        </div>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-surface2" />}>
          <ForgotPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-ink-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
