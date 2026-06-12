import { NextRequest, NextResponse } from "next/server";
import { insertKnowledgeBaseEntries } from "@/lib/db/knowledge-base";
import { chunkBySection, chunkHtmlDocument } from "@/lib/utils/chunk-text";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: NextRequest) {
  console.log("[api/kb/ingest] POST start");
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (e) {
    console.error("[api/kb/ingest] failed to parse formData:", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  console.log(`[api/kb/ingest] file: ${file.name}, size: ${file.size}, type: ${file.type}`);

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large (max 10MB)" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx = file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: "Only PDF and DOCX files are supported" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    let chunks: string[] = [];

    if (isPdf) {
      console.log("[api/kb/ingest] extracting PDF text");
      const { extractText } = await import("unpdf");
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      console.log(`[api/kb/ingest] PDF text length: ${text?.length ?? 0}`);
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: "No text could be extracted from this PDF. It may be scanned or image-based." },
          { status: 422 }
        );
      }
      chunks = chunkBySection(text);
    } else {
      console.log("[api/kb/ingest] converting DOCX to HTML");
      const mammoth = (await import("mammoth")).default;
      const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
      console.log(`[api/kb/ingest] DOCX html length: ${html?.length ?? 0}`);
      if (!html || html.trim().length === 0) {
        return NextResponse.json(
          { error: "No text could be extracted from this document." },
          { status: 422 }
        );
      }
      chunks = chunkHtmlDocument(html);
    }

    console.log(`[api/kb/ingest] ${chunks.length} chunks produced`);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No content to ingest after processing" }, { status: 422 });
    }

    const metadata = {
      source: isPdf ? "pdf" : "docx",
      filename: file.name,
      documentId: crypto.randomUUID(),
      totalChunks: chunks.length,
    };

    console.log(`[api/kb/ingest] embedding ${chunks.length} chunks`);
    const entries = await insertKnowledgeBaseEntries(chunks, metadata);
    console.log(`[api/kb/ingest] inserted ${entries.length} rows`);

    revalidatePath("/kb");
    return NextResponse.json({ success: true, chunksInserted: entries.length });
  } catch (error) {
    console.error("[api/kb/ingest] FAILED:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Embedding timed out — the AI service took too long to respond. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `Processing failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
