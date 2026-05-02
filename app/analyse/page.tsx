import { redirect } from "next/navigation";

export default function LegacyAnalysePage() {
  redirect("/dossiers/new");
}
