export function NouveauBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center border border-black bg-dm-yellow px-1.5 py-0 text-[10px] font-medium lowercase leading-5 tracking-wide ${className}`}
    >
      nouveau
    </span>
  );
}
