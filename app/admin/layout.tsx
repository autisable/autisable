import Link from "next/link";
import Image from "next/image";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-zinc-900 text-zinc-300 px-6 py-2 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2 hover:text-white transition-colors">
            <Image src="/Logo.png" alt="Autisable" width={100} height={26} className="h-5 w-auto brightness-0 invert opacity-80" priority />
            <span className="text-xs font-medium uppercase tracking-wider opacity-60">Admin</span>
          </Link>
          <Link href="/" className="text-xs hover:text-white transition-colors">
            View site &rarr;
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
