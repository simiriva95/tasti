import type { Metadata } from "next";
import { auth } from "@/auth";
import ToolClient from "@/components/ToolClient";

export const metadata: Metadata = {
  title: "App — carica un brano e vedi i tasti",
  alternates: { canonical: "/app" },
};

export default async function AppPage() {
  const session = await auth();
  const user = session?.user
    ? { id: session.user.id, name: session.user.name, image: session.user.image }
    : null;
  return <ToolClient user={user} />;
}
