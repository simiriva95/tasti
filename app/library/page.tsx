import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LibraryClient from "@/components/LibraryClient";

export const metadata: Metadata = {
  title: "La tua libreria",
  robots: { index: false },
};

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <LibraryClient />;
}
