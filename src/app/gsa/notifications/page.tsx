import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { notifications } from "@/lib/services/platform";

export default function NotificationsPage() {
  return (
    <>
      <Topbar title="Notifications" subtitle="Opportunity and workflow updates" />
      <main className="space-y-3 p-5">
        {notifications.map((notification) => (
          <Card key={notification.id} className={notification.status === "unread" ? "border-cyan-300/30" : undefined}>
            <CardContent className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
              </div>
              <p className="text-sm text-slate-500">{notification.time}</p>
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}
