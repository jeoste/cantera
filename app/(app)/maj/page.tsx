import { IngestForm } from "@/components/ingest-form";
import { requireRecruiter } from "@/lib/auth";

export default async function MajPage() {
  await requireRecruiter();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs lowercase tracking-[0.18em] text-dm-slate">
          agent
        </p>
        <h1 className="text-4xl">mettre à jour les profils</h1>
        <p className="mt-2 max-w-xl text-sm text-dm-muted">
          Colle un JSON <code>profiles</code> ou un retour libre. L’API agent
          est <code>POST /ingest</code>.
        </p>
      </div>
      <div className="border border-black bg-white p-6">
        <IngestForm />
      </div>
      <p className="text-xs text-dm-gray">
        OpenAPI :{" "}
        <a href="/ingest/openapi.json" className="underline">
          /ingest/openapi.json
        </a>
      </p>
    </div>
  );
}
