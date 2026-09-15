import { changeStatusAction } from "@/app/actions/candidates";
import { Button } from "@/components/ui/button";
import { QUICK_ACTIONS } from "@/lib/status";

export function StatusActions({ candidateId }: { candidateId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <form key={action.toStatus} action={changeStatusAction}>
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="toStatus" value={action.toStatus} />
          <input type="hidden" name="summary" value={action.summary} />
          <input type="hidden" name="eventType" value={action.eventType} />
          <Button
            type="submit"
            variant={action.toStatus === "interview" ? "default" : "outline"}
            className="rounded-full lowercase"
          >
            {action.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
