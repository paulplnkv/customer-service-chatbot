import { getPaginatedKnowledgeBaseEntries } from "@/lib/db/knowledge-base";
import { KbChunksTable } from "@/components/kb-chunks-table";

const PAGE_SIZE = 20;

export default async function KbPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pageParam = typeof params.page === "string" ? params.page : "1";
  let page = parseInt(pageParam, 10);
  if (isNaN(page) || page < 1) page = 1;

  const { entries, totalCount } = await getPaginatedKnowledgeBaseEntries(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (page > totalPages) page = totalPages;

  const chunks = entries.map((e) => ({
    ...e,
    metadata: e.metadata as Record<string, unknown> | null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Knowledge Base
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {totalCount} chunk{totalCount !== 1 && "s"}
      </p>

      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No knowledge base entries yet.
        </p>
      ) : (
        <KbChunksTable
          chunks={chunks}
          currentPage={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
