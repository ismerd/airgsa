"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type AssistantAction = {
  label: string;
  href: string;
  keywords: string[];
  role: "airline" | "gsa" | "both";
  response: string;
};

const actions: AssistantAction[] = [
  {
    label: "Create tender",
    href: "/airline/tenders/create",
    role: "airline",
    keywords: ["tender create", "tender erstellen", "tender erzeugen", "tender anlegen", "tender schalten", "ausschreibung erstellen", "ausschreibung anlegen", "neue ausschreibung"],
    response: "Ich öffne den Tender Builder.",
  },
  {
    label: "Tender workspace",
    href: "/airline/tenders",
    role: "airline",
    keywords: ["tenders", "tender workspace", "ausschreibungen", "tender liste", "tender dashboard"],
    response: "Ich öffne den Tender Workspace.",
  },
  {
    label: "Application decision room",
    href: "/airline/applications",
    role: "airline",
    keywords: ["applications", "bewerbungen", "bewerber", "application decision", "gsa bewerbungen"],
    response: "Ich öffne die Bewerbungsübersicht.",
  },
  {
    label: "Partner profiles",
    href: "/airline/gsa/overview",
    role: "airline",
    keywords: ["partner profiles", "partner profile", "gsa partner", "gsas", "partner", "routen zuweisen", "contract routes"],
    response: "Ich öffne die Partner-Profile.",
  },
  {
    label: "Fleet",
    href: "/airline/fleet",
    role: "airline",
    keywords: ["fleet", "flotte", "flugzeuge", "worldmap", "world map"],
    response: "Ich öffne die Fleet-Seite.",
  },
  {
    label: "GSA tender marketplace",
    href: "/gsa",
    role: "gsa",
    keywords: ["tenders", "open tenders", "marketplace", "ausschreibungen", "bewerben", "tender ansehen"],
    response: "Ich öffne den GSA Tender Marketplace.",
  },
  {
    label: "GSA profile",
    href: "/gsa/profile",
    role: "gsa",
    keywords: ["profil", "profile", "firma", "company profile", "gsa profile"],
    response: "Ich öffne dein GSA-Profil.",
  },
  {
    label: "Notifications",
    href: "/gsa/notifications",
    role: "gsa",
    keywords: ["notifications", "benachrichtigungen", "meldungen", "glocke"],
    response: "Ich öffne die Benachrichtigungen.",
  },
];

export function CommandAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const role = pathname.startsWith("/gsa") ? "gsa" : "airline";
  const starter = useMemo<AssistantMessage[]>(
    () => [
      {
        id: "starter",
        role: "assistant",
        text:
          role === "airline"
            ? "Ich kann dich aktuell zu Tender Builder, Bewerbungen, Partner Profiles oder Fleet bringen."
            : "Ich kann dich aktuell zu offenen Tendern, deinem Profil oder Benachrichtigungen bringen.",
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

    const match = findAction(value, role);
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", text: value };
    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: match
        ? match.response
        : "Das kann ich aktuell noch nicht sicher ausführen. Probier zum Beispiel: Tender erstellen, Bewerbungen öffnen oder Partner Profiles.",
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

  const quickActions = actions.filter((action) => action.role === role || action.role === "both").slice(0, 4);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : resetAndOpen())}
        className={`${buttonVariants({ variant: "ghost", size: "icon" })} relative`}
        aria-label="AI command assistant"
      >
        <Bot className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-border-ui bg-surface shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-border-ui px-4 py-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageCircle className="h-4 w-4 text-brand" />
                AirGSA Assistant
              </p>
              <p className="mt-1 text-xs text-ink-muted">Navigation only. No data queries.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-muted hover:bg-surface2 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : "bg-surface2 text-ink-muted"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-border-ui p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => submitCommand(action.keywords[0])}
                  className="rounded-full border border-border-ui bg-surface2 px-3 py-1 text-xs font-semibold text-ink-muted transition hover:border-brand/40 hover:text-brand"
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
                placeholder={role === "airline" ? "z.B. Tender erstellen" : "z.B. offene Tender anzeigen"}
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

function findAction(input: string, role: "airline" | "gsa") {
  const normalized = normalize(input);
  return actions.find((action) => {
    if (action.role !== "both" && action.role !== role) return false;
    return action.keywords.some((keyword) => normalized.includes(normalize(keyword)));
  });
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
