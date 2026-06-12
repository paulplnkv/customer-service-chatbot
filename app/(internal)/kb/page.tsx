import { getKnowledgeBaseDocuments } from "@/lib/db/knowledge-base";
import { KbDocumentsTable } from "@/components/kb-documents-table";
import { KbIngestForm } from "@/components/kb/kb-ingest-form";

export default async function KbPage() {
  const documents = await getKnowledgeBaseDocuments();

  const docs = documents.map((d) => ({
    ...d,
    createdAt: new Date(d.createdAt).toISOString(),
  }));

  const totalChunks = docs.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <div className="px-8 py-7">
      <div className="flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">RAG Source</div>
          <h1 className="mt-0.5 font-display text-3xl">Knowledge base</h1>
        </div>
        <div className="text-[13px] text-muted-foreground">
          <span className="font-medium text-ink">{docs.length}</span>{" "}
          {docs.length !== 1 ? "documents" : "document"}
          {totalChunks > 0 && (
            <span className="ml-2 text-muted-foreground/70">
              ({totalChunks} chunk{totalChunks !== 1 && "s"})
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-8">
        <section>
          <div className="label-eyebrow">Ingest content</div>
          <KbIngestForm />
        </section>

        <section>
          <div className="label-eyebrow mb-2">Indexed documents</div>
          {docs.length === 0 ? (
            <div className="rounded-md border border-rule bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No documents indexed yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-rule bg-card">
              <KbDocumentsTable documents={docs} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
