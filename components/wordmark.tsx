import Link from "next/link";
import { CanteraMark } from "@/components/cantera-mark";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <CanteraMark className="h-9 w-9 shrink-0 border border-black" />
      <span className="flex flex-col leading-none">
        <span
          className="text-xl font-medium lowercase tracking-tight text-dm-teal"
          style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
        >
          cantera
        </span>
        <span className="mt-1 text-[10px] tracking-[0.14em] text-dm-muted">
          data-major ibérica
        </span>
      </span>
    </Link>
  );
}
