"use client";

import { archiveCandidateAction } from "@/app/actions/candidates";
import { Button } from "@/components/ui/button";

export function DeleteCandidateButton({
  candidateId,
  fullName,
}: {
  candidateId: string;
  fullName: string;
}) {
  return (
    <form
      action={archiveCandidateAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Retirer ${fullName} du pipeline ? Toute l’équipe @data-major.com peut le faire.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <Button type="submit" variant="destructive" className="rounded-full lowercase">
        supprimer
      </Button>
    </form>
  );
}
