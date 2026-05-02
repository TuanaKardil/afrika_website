import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-24 text-center max-w-lg">
      <p className="font-headline text-6xl text-primary font-semibold mb-4">404</p>
      <h1 className="font-headline text-2xl text-on-surface mb-3">
        Sayfa bulunamadi
      </h1>
      <p className="font-body text-on-surface/60 mb-8 leading-relaxed">
        Aradiginiz sayfa kaldirilmis, tasınmıs ya da hic var olmamis olabilir.
      </p>
      <Link
        href="/"
        className="inline-block bg-primary text-white font-body text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-tertiary transition-colors"
      >
        Ana Sayfaya Don
      </Link>
    </main>
  );
}
