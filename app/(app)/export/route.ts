import { NextResponse } from "next/server";
import { requireRecruiter } from "@/lib/auth";
import { listCandidatesForExport } from "@/lib/candidates";

function csvCell(value: unknown) {
  const text =
    value instanceof Date
      ? value.toISOString()
      : Array.isArray(value)
        ? value.join("|")
        : value == null
          ? ""
          : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  await requireRecruiter();
  const rows = await listCandidatesForExport();
  const header = [
    "full_name",
    "linkedin_url",
    "status",
    "current_title",
    "current_company",
    "location",
    "last_contacted_at",
    "owner",
    "notes",
    "red_flags",
    "do_not_propose",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.fullName,
        row.linkedinUrl,
        row.status,
        row.currentTitle,
        row.currentCompany,
        row.locationRaw,
        row.lastContactedAt,
        row.ownerName,
        row.notes,
        row.redFlags,
        row.doNotPropose,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="candidats-data-major.csv"',
    },
  });
}
