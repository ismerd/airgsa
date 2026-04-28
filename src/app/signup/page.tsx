import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5">
      <Card className="w-full max-w-lg bg-white text-slate-950">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-950">Create your workspace</CardTitle>
          <p className="text-sm text-slate-500">Connect this form to Supabase Auth and company onboarding when credentials are available.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input className="border-slate-200 bg-white text-slate-950" placeholder="Full name" />
          <Input className="border-slate-200 bg-white text-slate-950" placeholder="Company name" />
          <Input className="border-slate-200 bg-white text-slate-950" placeholder="work@email.com" type="email" />
          <Select className="border-slate-200 bg-white text-slate-950">
            <option>Airline</option>
            <option>GSA</option>
            <option>Admin</option>
          </Select>
          <Link href="/role-selection" className={buttonVariants()}>Create account</Link>
          <p className="text-center text-sm text-slate-500">
            Already registered? <Link href="/login" className="font-semibold text-cyan-700">Login</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
