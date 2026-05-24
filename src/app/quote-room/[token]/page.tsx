import { QuoteRoomClient } from "./quote-room-client";

export default async function QuoteRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <QuoteRoomClient token={token} />;
}
