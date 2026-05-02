import Link from "next/link";
import Image from "next/image";
import AdminGate from "./AdminGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-white text-zinc-600 px-6 py-2 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/Logo.png" alt="Autisable" width={120} height={32} className="h-7 w-auto" priority />
            <span className="px-2 py-0.5 bg-brand-blue-light text-brand-blue text-[10px] font-semibold uppercase tracking-wider rounded">
              Admin
            </span>
          </Link>
          <Link href="/" className="text-xs text-brand-blue hover:underline">
            View site &rarr;
          </Link>
        </div>
      </div>
      <AdminGate>{children}</AdminGate>
    </>
  );
}
