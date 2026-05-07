import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-5">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-ink">Create your workspace</CardTitle>
          <p className="text-sm text-ink-muted">Connect this form to Supabase Auth and company onboarding when credentials are available.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input placeholder="Full name" />
          <Input placeholder="Company name" />
          <Input placeholder="work@email.com" type="email" />
          <Select>
            <option>Airline</option>
            <option>GSA</option>
            <option>Admin</option>
          </Select>
          <Link href="/role-selection" className={buttonVariants()}>Create account</Link>
          <p className="text-center text-sm text-ink-muted">
            Already registered? <Link href="/login" className="font-semibold text-brand">Login</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
