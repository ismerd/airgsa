"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import {
  findNavigationAction,
  getActionsForRole,
  getDashboardRole,
  type DashboardRole,
} from "@/components/dashboard/navigation-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export function CommandAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const role = getDashboardRole(pathname);
  const starter = useMemo<AssistantMessage[]>(
    () => [
      {
        id: "starter",
        role: "assistant",
        text: starterText(role),
      },
    ],
    [role],
  );
  const [messages, setMessages] = useState<AssistantMessage[]>(starter);

  function resetAndOpen() {
    setMessages(starter);
    setOpen(true);
  }

  function submitCommand(command = input) {
    const value = command.trim();
    if (!value) return;

    const match = findNavigationAction(value, role);
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", text: value };
    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: match
        ? match.response
        : "I could not match that to a workspace action. Try create tender, quote inbox, cargo workspace, contracts, accounts, or team.",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");

    if (match) {
      window.setTimeout(() => {
        setOpen(false);
        router.push(match.href);
      }, 250);
    }
  }

  const quickActions = getActionsForRole(role).slice(0, 4);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : resetAndOpen())}
        className={`${buttonVariants({ variant: "ghost", size: "icon" })} relative`}
        aria-label="Command assistant"
      >
        <Bot className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-border-ui bg-surface animate-scale-in"
          style={{
            transformOrigin: "top right",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(96,165,250,0.06)",
          }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border-ui px-4 py-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageCircle className="h-4 w-4 text-brand" />
                AirGSA Assistant
              </p>
              <p className="mt-1 text-xs text-ink-muted">Navigation and workflow shortcuts.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-ink-muted transition hover:bg-surface2 hover:text-ink"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : "bg-surface2 text-ink"
                }`}
                style={message.role === "user" ? { boxShadow: "0 2px 12px rgba(26,90,255,0.3)" } : undefined}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-border-ui p-3">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => submitCommand(action.label)}
                  className="rounded-full border border-border-ui bg-surface2 px-3 py-1 text-xs font-semibold text-ink-muted transition-all duration-150 hover:border-brand/50 hover:bg-brand-light hover:text-brand"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitCommand();
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={placeholderForRole(role)}
              />
              <Button type="submit" size="icon" aria-label="Send command">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function starterText(role: DashboardRole) {
  if (role === "airline") {
    return "I can open the airline work areas: tenders, applications, partner activation, contracts, performance, profile, and team.";
  }
  if (role === "gsa") {
    return "I can open the GSA work areas: tasks, quote inbox, cargo workspace, tenders, reports, integrations, profile, and team.";
  }
  return "I can open admin areas: accounts, email delivery, sources, content import, and diagnostics.";
}

function placeholderForRole(role: DashboardRole) {
  if (role === "airline") return "Try: create tender";
  if (role === "gsa") return "Try: quote inbox";
  return "Try: accounts";
}
