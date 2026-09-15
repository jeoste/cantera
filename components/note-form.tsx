import { addNoteAction } from "@/app/actions/candidates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ candidateId }: { candidateId: string }) {
  return (
    <form action={addNoteAction} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <Textarea
        name="summary"
        required
        rows={3}
        placeholder="Retour Antoine, note d’entretien, prochaine action…"
        className="rounded-none border-black bg-white"
      />
      <Button type="submit" className="rounded-full lowercase">
        enregistrer la note
      </Button>
    </form>
  );
}
