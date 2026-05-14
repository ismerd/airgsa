"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        <LogOut className="h-3.5 w-3.5" />
      </span>
      Log out
    </button>
  );
}
