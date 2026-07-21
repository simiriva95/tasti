import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { PianoKeysIcon, GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Accedi",
  robots: { index: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-[#0c0718] px-6 text-zinc-100">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-indigo-400 text-white">
          <PianoKeysIcon size={22} weight="fill" />
        </span>
        <span className="text-xl font-semibold tracking-tight">Tasti</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white/[0.04] p-8 text-center ring-1 ring-white/10">
        <h1 className="text-2xl font-semibold tracking-tight">Accedi</h1>
        <p className="mt-2 text-sm text-zinc-400">
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
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            <GithubLogoIcon size={20} weight="bold" />
            Continua con GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
