import { redirect } from "next/navigation";

// Ingestion now lives on the combined Knowledge base page (reference parity).
export default function KBIngestPage() {
  redirect("/kb");
}
