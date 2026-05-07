import { Database, LayoutDashboard, Newspaper, Users } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";

const nav = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Accounts", href: "/admin/accounts", icon: Users },
  { label: "Sources", href: "/admin/sources", icon: Database },
  { label: "Content import", href: "/admin/content", icon: Newspaper },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar items={nav} role="Admin" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
