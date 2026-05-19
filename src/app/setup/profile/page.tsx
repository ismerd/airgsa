import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { ProfileSetupForm } from "./profile-setup-form";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const airlineProfile = session.role === "airline" ? await getAirlineProfile(session) : {};

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-5 py-10">
      <ProfileSetupForm session={session} airlineLogoPath={airlineProfile.logoPath} />
    </main>
  );
}
