import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CreateTenderClient } from "./create-tender-client";

export const dynamic = "force-dynamic";

export default async function CreateTenderPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/airline/tenders/create");
  if (session.role !== "airline") redirect("/");

  return <CreateTenderClient airlineName={session.company?.trim() || "Airline"} />;
}
