import type { User } from "@/drizzle/schema";

export function PipelineFilters({
  owners,
  query,
  ownerUserId,
}: {
  owners: User[];
  query: string;
  ownerUserId: string;
}) {
  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs lowercase tracking-wide text-dm-muted">
          recherche
        </span>
        <input
          name="q"
          defaultValue={query}
          placeholder="Nom, entreprise, LinkedIn"
          className="h-9 border border-black bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-dm-teal"
        />
      </label>
      <label className="flex w-full flex-col gap-1 sm:w-56">
        <span className="text-xs lowercase tracking-wide text-dm-muted">
          owner
        </span>
        <select
          name="owner"
          defaultValue={ownerUserId}
          className="h-9 border border-black bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-dm-teal"
        >
          <option value="">Tout le monde</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-9 rounded-full bg-dm-teal px-4 text-sm lowercase text-dm-paper"
      >
        filtrer
      </button>
    </form>
  );
}
