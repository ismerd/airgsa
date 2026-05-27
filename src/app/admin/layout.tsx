import { Database, LayoutDashboard, MailCheck, Newspaper, Users, Wifi } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";

const nav: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Accounts", href: "/admin/accounts", icon: Users },
      { label: "Email delivery", href: "/admin/email-deliveries", icon: MailCheck },
    ],
  },
  {
    heading: "Data & diagnostics",
    variant: "disclosure",
    description: "Secondary tools for source import and optional live-flight checks.",
    items: [
      { label: "Sources", href: "/admin/sources", icon: Database },
      { label: "Content import", href: "/admin/content", icon: Newspaper },
      { label: "FR24 API test", href: "/admin/fr24", icon: Wifi },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar groups={nav} role="Admin" />
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
