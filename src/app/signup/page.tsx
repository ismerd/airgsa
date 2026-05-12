import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-page px-5 py-12">
      <Suspense fallback={<div className="mx-auto h-[600px] max-w-xl animate-pulse rounded-2xl bg-surface2" />}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
