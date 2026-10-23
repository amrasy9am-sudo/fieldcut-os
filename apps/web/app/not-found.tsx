import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <p className="font-mono text-sm font-bold text-dawn">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Nothing cut here.</h1>
      <p className="mt-2 text-muted">That page or order doesn&apos;t exist. Check the reference and try again.</p>
      <Link href="/" className="mt-6 inline-block font-bold text-field">← Back to the menu</Link>
    </div>
  );
}
