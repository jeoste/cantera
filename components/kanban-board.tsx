"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addNoteAction, moveCandidateAction } from "@/app/actions/candidates";
import type { CandidateStatus } from "@/drizzle/schema";
import { NouveauBadge } from "@/components/nouveau-badge";
import { formatDate } from "@/lib/format";
import { isFresh } from "@/lib/fresh";
import {
  KANBAN_COLUMNS,
  STATUS_LABELS,
  statusAfterDrop,
} from "@/lib/status";

export type KanbanCard = {
  id: string;
  fullName: string;
  currentTitle: string | null;
  currentCompany: string | null;
  locationRaw: string | null;
  status: CandidateStatus;
  ownerName: string | null;
  lastContactedAt: string | null;
  createdAt: string;
};

type PendingNote = {
  candidateId: string;
  fullName: string;
  toStatus: CandidateStatus;
};

export function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingNote | null>(null);
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(cards);
  }, [cards]);

  function onDragStart(id: string) {
    setDraggingId(id);
  }

  function applyMove(candidateId: string, toStatus: CandidateStatus, extraNote?: string) {
    const current = items.find((card) => card.id === candidateId);
    if (!current || current.status === toStatus) return;

    setItems((prev) =>
      prev.map((card) =>
        card.id === candidateId ? { ...card, status: toStatus } : card,
      ),
    );
    startTransition(async () => {
      await moveCandidateAction({
        candidateId,
        toStatus,
        note: extraNote,
      });
      router.refresh();
    });
  }

  function onDropColumn(columnId: string) {
    if (!draggingId) return;
    const card = items.find((item) => item.id === draggingId);
    setDraggingId(null);
    setOverColumn(null);
    if (!card) return;
    const toStatus = statusAfterDrop(columnId, card.status);
    if (toStatus === card.status) return;
    setPending({
      candidateId: card.id,
      fullName: card.fullName,
      toStatus,
    });
    setNote("");
    applyMove(card.id, toStatus);
  }

  function savePendingNote() {
    if (!pending || !note.trim()) {
      setPending(null);
      setNote("");
      return;
    }
    const candidateId = pending.candidateId;
    const summary = note.trim();
    setPending(null);
    setNote("");
    startTransition(async () => {
      const form = new FormData();
      form.set("candidateId", candidateId);
      form.set("summary", summary);
      await addNoteAction(form);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-dm-muted">
        Glisse un profil d’une colonne à l’autre. Toute l’équipe @data-major.com
        peut déplacer, modifier et supprimer.
      </p>
      <div className="flex min-h-[70vh] gap-3 overflow-x-auto pb-6">
        {KANBAN_COLUMNS.map((column) => {
          const columnCards = items.filter((card) =>
            (column.statuses as readonly string[]).includes(card.status),
          );
          const active = overColumn === column.id;
          return (
            <section
              key={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOverColumn(column.id);
              }}
              onDragLeave={() => {
                if (overColumn === column.id) setOverColumn(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDropColumn(column.id);
              }}
              className={`flex w-[280px] shrink-0 flex-col border bg-white ${
                active ? "border-dm-teal ring-2 ring-dm-yellow" : "border-black"
              }`}
            >
              <header className="flex items-baseline justify-between border-b-2 border-black px-3 py-2">
                <h2 className="text-lg">{column.label}</h2>
                <span className="text-xs text-dm-muted">{columnCards.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {columnCards.length === 0 ? (
                  <p className="px-1 py-6 text-xs text-dm-gray">
                    Dépose un profil ici.
                  </p>
                ) : (
                  columnCards.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => onDragStart(card.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverColumn(null);
                      }}
                      className={`cursor-grab border border-black bg-dm-paper active:cursor-grabbing ${
                        draggingId === card.id ? "opacity-40" : ""
                      }`}
                    >
                      <Link
                        href={`/candidates/${card.id}`}
                        className="block p-3 transition-colors hover:bg-dm-yellow/40"
                        onClick={(event) => {
                          if (draggingId === card.id) event.preventDefault();
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">
                            {card.fullName}
                          </p>
                          {isFresh(card.createdAt) ? <NouveauBadge /> : null}
                        </div>
                        <p className="mt-1 text-xs text-dm-muted">
                          {[card.currentTitle, card.currentCompany]
                            .filter(Boolean)
                            .join(" · ") || "Titre à préciser"}
                        </p>
                        {card.locationRaw ? (
                          <p className="mt-1 text-xs text-dm-gray">
                            {card.locationRaw}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] lowercase text-dm-slate">
                          <span>{STATUS_LABELS[card.status]}</span>
                          <span>
                            {card.ownerName ?? "sans owner"}
                            {card.lastContactedAt
                              ? ` · ${formatDate(card.lastContactedAt)}`
                              : ""}
                          </span>
                        </div>
                      </Link>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {pending ? (
        <div className="sticky bottom-4 z-10 border border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <p className="text-sm">
            {pending.fullName} → {STATUS_LABELS[pending.toStatus]}. Ajouter une
            note ?
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Retour, salaire, prochaine action…"
              className="h-9 flex-1 border border-black bg-dm-paper px-3 text-sm"
            />
            <button
              type="button"
              onClick={savePendingNote}
              className="h-9 rounded-full bg-dm-teal px-4 text-sm lowercase text-dm-paper"
            >
              enregistrer
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setNote("");
              }}
              className="h-9 px-3 text-sm lowercase text-dm-muted"
            >
              ignorer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
