import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F7F3EE] text-[#1E1B18]">
      <section className="grid min-h-screen place-items-center px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-[#1E1B18]/60">Alouré Atelier</p>
          <h1 className="font-serif text-5xl leading-tight text-[#1E1B18] sm:text-6xl">
            Precision foundation color matching reimagined as couture.
          </h1>
          <p className="text-base text-[#1E1B18]/70 sm:text-lg">
            We blend luxury narrative with quiet color science so your custom foundation starts with a graceful journey, not a dashboard.
          </p>
          <Link
            href="/upload"
            className="mx-auto rounded-full border border-transparent bg-[#1E1B18] px-10 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#F7F3EE] transition hover:-translate-y-0.5 hover:bg-[#12100d]"
          >
            Create Your Custom Foundation
          </Link>
        </div>
      </section>
    </main>
  );
}
