"use client";

import { useState, useRef } from "react";
import { ingestText } from "@/app/(internal)/kb/ingest/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function detectFileType(file: File): "pdf" | "docx" | "unsupported" {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
    return "pdf";
  if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx"))
    return "docx";
  return "unsupported";
}

export function KbIngestForm() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleTextSubmit(formData: FormData) {
    setStatus({ type: "loading" });
    try {
      const result = await ingestText(formData);
      if (result.success) {
        setStatus({ type: "success", message: "Entry indexed successfully." });
        const form = document.querySelector("form") as HTMLFormElement;
        form?.reset();
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } catch {
      setStatus({
        type: "error",
        message: "Upload failed — the server did not respond. Please try again.",
      });
    }
  }

  async function handleFileSubmit() {
    if (!selectedFile) return;

    const fileType = detectFileType(selectedFile);
    setStatus({ type: "loading" });

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/kb/ingest", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const label = fileType === "docx" ? "DOCX" : "PDF";
        setStatus({
          type: "success",
          message: `${label} processed — ${result.chunksInserted} chunks embedded and stored.`,
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setStatus({ type: "error", message: result.error ?? "Upload failed. Please try again." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: "error", message: `Upload failed: ${msg}` });
    }
  }

  function handleFileSelect(file: File | undefined) {
    if (!file) return;

    if (detectFileType(file) === "unsupported") {
      setStatus({ type: "error", message: "Only PDF and DOCX files are supported." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus({ type: "error", message: "File is too large (max 10MB)." });
      return;
    }

    setSelectedFile(file);
    setStatus({ type: "idle" });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  function handleModeChange(next: "text" | "file") {
    setMode(next);
    setStatus({ type: "idle" });
    setSelectedFile(null);
  }

  const isLoading = status.type === "loading";
  const fileType = selectedFile ? detectFileType(selectedFile) : null;

  return (
    <div>
      <div className="mt-2 flex gap-1 border-b border-rule">
        <button
          onClick={() => handleModeChange("text")}
          className={`-mb-px border-b-2 px-3 py-2 text-[12px] ${
            mode === "text"
              ? "border-ink text-ink"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Paste text
        </button>
        <button
          onClick={() => handleModeChange("file")}
          className={`-mb-px border-b-2 px-3 py-2 text-[12px] ${
            mode === "file"
              ? "border-ink text-ink"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === "text" ? (
        <form action={handleTextSubmit} className="mt-3 space-y-2">
          <Input
            name="name"
            placeholder="Source name (e.g. 'Aviation Coverage Guide')"
          />
          <textarea
            name="content"
            rows={10}
            required
            placeholder="Paste knowledge base content here…"
            className="min-h-[180px] w-full resize-none rounded-md border border-rule bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Embedding & storing…" : "Embed & index"}
          </Button>
        </form>
      ) : (
        <div className="mt-3 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors ${
              isDragging
                ? "border-ink bg-secondary"
                : "border-rule hover:bg-secondary"
            }`}
          >
            <Upload size={20} className="text-muted-foreground" />
            <div className="mt-2 text-[13px]">
              {selectedFile ? (
                <span>
                  {selectedFile.name}{" "}
                  <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                    {fileType}
                  </span>
                </span>
              ) : (
                "Drop a PDF or DOCX, or click to upload"
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : "PDF · DOCX · Auto-embedded for retrieval · max 10MB"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>

          <Button onClick={handleFileSubmit} disabled={isLoading || !selectedFile}>
            {isLoading
              ? `Processing ${fileType?.toUpperCase() ?? "file"}…`
              : "Upload & process"}
          </Button>
        </div>
      )}

      {status.type === "success" && (
        <p className="mt-4 text-sm text-ink">{status.message}</p>
      )}
      {status.type === "error" && (
        <p className="mt-4 text-sm text-destructive">{status.message}</p>
      )}
    </div>
  );
}
