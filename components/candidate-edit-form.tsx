import type { ReactNode } from "react";
import { candidateStatuses, type Candidate } from "@/drizzle/schema";
import { updateCandidateAction } from "@/app/actions/candidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from "@/lib/status";

export function CandidateEditForm({ candidate }: { candidate: Candidate }) {
  return (
    <form action={updateCandidateAction} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidate.id} />
      <input type="hidden" name="previousStatus" value={candidate.status} />
      <Field label="Nom" htmlFor="fullName">
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={candidate.fullName}
          className="rounded-none border-black"
        />
      </Field>
      <Field label="URL LinkedIn" htmlFor="linkedinUrl">
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          required
          defaultValue={candidate.linkedinUrl}
          className="rounded-none border-black"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titre" htmlFor="currentTitle">
          <Input
            id="currentTitle"
            name="currentTitle"
            defaultValue={candidate.currentTitle ?? ""}
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Entreprise" htmlFor="currentCompany">
          <Input
            id="currentCompany"
            name="currentCompany"
            defaultValue={candidate.currentCompany ?? ""}
            className="rounded-none border-black"
          />
        </Field>
      </div>
      <Field label="Lieu" htmlFor="locationRaw">
        <Input
          id="locationRaw"
          name="locationRaw"
          defaultValue={candidate.locationRaw ?? ""}
          className="rounded-none border-black"
        />
      </Field>
      <Field label="Headline" htmlFor="headline">
        <Input
          id="headline"
          name="headline"
          defaultValue={candidate.headline ?? ""}
          className="rounded-none border-black"
        />
      </Field>
      <Field label="Statut" htmlFor="status">
        <select
          id="status"
          name="status"
          defaultValue={candidate.status}
          className="h-9 w-full border border-black bg-white px-3 text-sm"
        >
          {candidateStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Risque salaire" htmlFor="salaryRisk">
          <Input
            id="salaryRisk"
            name="salaryRisk"
            defaultValue={candidate.salaryRisk ?? ""}
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Remote" htmlFor="remoteFlag">
          <Input
            id="remoteFlag"
            name="remoteFlag"
            defaultValue={candidate.remoteFlag ?? ""}
            className="rounded-none border-black"
          />
        </Field>
      </div>
      <Field label="Flags (séparés par une virgule)" htmlFor="redFlags">
        <Input
          id="redFlags"
          name="redFlags"
          defaultValue={candidate.redFlags.join(", ")}
          className="rounded-none border-black"
        />
      </Field>
      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          defaultValue={candidate.notes ?? ""}
          className="rounded-none border-black"
          rows={5}
        />
      </Field>
      <Button type="submit" className="rounded-full lowercase">
        enregistrer les modifications
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="lowercase text-dm-muted">
        {label}
      </Label>
      {children}
    </div>
  );
}
