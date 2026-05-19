import { getSession } from "@/lib/auth/session";
import { resolveGsaOperationalProfile } from "@/lib/services/gsa-profile";
import { ApplyTenderClient } from "./apply-tender-client";

export default async function ApplyTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const gsa = await resolveGsaOperationalProfile(session);

  return <ApplyTenderClient tenderId={id} gsa={gsa} />;
}
