import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <WifiOff className="mb-3 size-10 text-muted" aria-hidden />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        This page hasn&apos;t been opened on this device yet, so it isn&apos;t available offline. Pages you&apos;ve visited before still work, and
        data saved on this device is still there.
      </p>
      <Link href="/" className="mt-4 font-medium text-primary underline">
        Go to dashboard
      </Link>
    </div>
  );
}
