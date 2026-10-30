import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted">That page doesn&apos;t exist.</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
