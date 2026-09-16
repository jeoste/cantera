"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AgentApplyResult } from "@/lib/agent/types";

const EXAMPLE = `{
  "createIfMissing": true,
  "profiles": [
    {
      "fullName": "Luis García",
      "linkedinUrl": "https://www.linkedin.com/in/luis-garcia",
      "currentTitle": "Data Engineer",
      "currentCompany": "Inditex",
      "locationRaw": "Málaga, España",
      "status": "to_contact",
      "notes": "Français courant, Málaga."
    }
  ]
}`;

export function IngestForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AgentApplyResult[] | null>(null);
  const [text, setText] = useState(EXAMPLE);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const raw = text.trim();
        setError(null);
        startTransition(async () => {
          let body: unknown;
          try {
            body = JSON.parse(raw);
          } catch {
            body = { text: raw, createIfMissing: true };
          }
          const response = await fetch("/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const payload = (await response.json()) as {
            ok?: boolean;
            error?: string;
            issues?: { path: string; message: string }[];
            results?: AgentApplyResult[];
          };
          if (!response.ok || payload.ok === false) {
            const extra = payload.issues
              ?.map((issue) => `${issue.path}: ${issue.message}`)
              .join(" · ");
            setError([payload.error, extra].filter(Boolean).join(" — ") || "Échec ingest.");
            setResults(payload.results ?? null);
            return;
          }
          setResults(payload.results ?? []);
        });
      }}
    >
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={16}
        className="rounded-none border-black bg-white font-mono text-sm"
      />
      <Button type="submit" disabled={pending} className="rounded-full lowercase">
        {pending ? "mise à jour…" : "appliquer aux profils"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {results ? (
        <ul className="space-y-2 border border-black bg-dm-paper p-4 text-sm">
          {results.map((item, index) => (
            <li key={`${item.candidateId ?? item.fullName ?? index}-${index}`}>
              <span className="lowercase text-dm-slate">{item.action}</span>
              {" · "}
              {item.fullName ?? "—"}
              {item.linkedinUrl ? ` · ${item.linkedinUrl}` : ""}
              {item.changes.length > 0 ? ` · ${item.changes.join(", ")}` : ""}
              {item.reason ? ` · ${item.reason}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
