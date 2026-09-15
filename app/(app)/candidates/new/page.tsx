import type { ReactNode } from "react";
import { createCandidateAction } from "@/app/actions/candidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRecruiter } from "@/lib/auth";

export default async function NewCandidatePage() {
  await requireRecruiter();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-xs lowercase tracking-[0.18em] text-dm-slate">
          nouveau profil
        </p>
        <h1 className="text-4xl">ajouter un candidat</h1>
      </div>
      <form action={createCandidateAction} className="space-y-4 border border-black bg-white p-6">
        <Field label="URL LinkedIn" htmlFor="linkedinUrl">
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            required
            placeholder="https://www.linkedin.com/in/…"
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Nom complet" htmlFor="fullName">
          <Input
            id="fullName"
            name="fullName"
            required
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Titre" htmlFor="currentTitle">
          <Input
            id="currentTitle"
            name="currentTitle"
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Entreprise" htmlFor="currentCompany">
          <Input
            id="currentCompany"
            name="currentCompany"
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Lieu" htmlFor="locationRaw">
          <Input
            id="locationRaw"
            name="locationRaw"
            placeholder="Málaga, Espagne"
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Headline LinkedIn" htmlFor="headline">
          <Input
            id="headline"
            name="headline"
            className="rounded-none border-black"
          />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            className="rounded-none border-black"
          />
        </Field>
        <Button type="submit" className="rounded-full lowercase">
          enregistrer
        </Button>
      </form>
    </div>
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
