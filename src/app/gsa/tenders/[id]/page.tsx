import { GsaTenderDetailClient } from "./tender-detail-client";

export default async function GsaTenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GsaTenderDetailClient tenderId={id} />;
}
