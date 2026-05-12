import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-5">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-surface2" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
