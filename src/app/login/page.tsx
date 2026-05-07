import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-ink">Login to AirGSA</CardTitle>
          <p className="text-sm text-ink-muted">Supabase Auth-ready form. Mock routing is enabled for the prototype.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="work@email.com" type="email" />
          <Input placeholder="Password" type="password" />
          <Link href="/role-selection" className={buttonVariants({ className: "w-full" })}>Continue</Link>
          <p className="text-center text-sm text-ink-muted">
            New to AirGSA? <Link href="/signup" className="font-semibold text-brand">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
