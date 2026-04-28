import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5">
      <Card className="w-full max-w-md bg-white text-slate-950">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-950">Login to AirGSA</CardTitle>
          <p className="text-sm text-slate-500">Supabase Auth-ready form. Mock routing is enabled for the prototype.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input className="border-slate-200 bg-white text-slate-950" placeholder="work@email.com" type="email" />
          <Input className="border-slate-200 bg-white text-slate-950" placeholder="Password" type="password" />
          <Link href="/role-selection" className={buttonVariants({ className: "w-full" })}>Continue</Link>
          <p className="text-center text-sm text-slate-500">
            New to AirGSA? <Link href="/signup" className="font-semibold text-cyan-700">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
