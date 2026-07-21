import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Accedi",
  robots: { index: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <div className="ch-spotlight flex min-h-[100dvh] flex-col items-center justify-center gap-10 px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 items-end gap-[2px]" aria-hidden="true">
          <span className="h-5 w-[3px] rounded-sm bg-[var(--ch-ivory)]" />
          <span className="h-3.5 w-[3px] rounded-sm bg-[var(--ch-brass)]" />
          <span className="h-5 w-[3px] rounded-sm bg-[var(--ch-ivory)]" />
        </span>
        <span className="display text-2xl leading-none text-[var(--ch-ivory)]">
          Tasti
        </span>
      </div>

      <div className="w-full max-w-sm text-center">
        <h1
          className="display text-[var(--ch-ivory)]"
          style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", lineHeight: 1.05 }}
        >
          Accedi.
        </h1>
        <p className="mx-auto mt-3 max-w-[34ch] leading-relaxed text-[var(--ch-muted)]">
          Salva i tuoi brani in una libreria personale.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/app" });
          }}
        >
          <button
            type="submit"
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[var(--ch-brass)] px-4 py-3.5 font-semibold text-[var(--ch-bg-deep)] transition duration-300 hover:bg-[var(--ch-ivory)]"
          >
            <GithubLogoIcon size={20} weight="bold" />
            Continua con GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
