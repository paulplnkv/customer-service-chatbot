"use client";

import { useState, useRef } from "react";
import { ingestText, ingestPdf } from "./actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function KBIngestPage() {
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleTextSubmit(formData: FormData) {
    setStatus({ type: "loading" });
    const result = await ingestText(formData);

    if (result.success) {
      setStatus({ type: "success", message: `Entry added (ID: ${result.id})` });
      const form = document.querySelector("form") as HTMLFormElement;
      form?.reset();
    } else {
      setStatus({ type: "error", message: result.error });
    }
  }

  async function handlePdfSubmit() {
    if (!selectedFile) return;

    setStatus({ type: "loading" });
    const formData = new FormData();
    formData.append("file", selectedFile);

    const result = await ingestPdf(formData);

    if (result.success) {
      setStatus({
        type: "success",
        message: `PDF processed — ${result.chunksInserted} chunks embedded and stored.`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setStatus({ type: "error", message: result.error });
    }
  }

  function handleFileSelect(file: File | undefined) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus({ type: "error", message: "Only PDF files are supported." });
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

  const isLoading = status.type === "loading";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Knowledge Base Ingestion
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Add content to the auto insurance knowledge base. Content will be
        embedded and stored for RAG retrieval.
      </p>

      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">
            <FileText className="size-4" />
            Text
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <Upload className="size-4" />
            PDF Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <form action={handleTextSubmit} className="space-y-4">
            <textarea
              name="content"
              rows={12}
              required
              placeholder="Paste or type knowledge base content here..."
              className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Embedding & Storing..." : "Submit"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="pdf">
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-12 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-muted-foreground"
              }`}
            >
              <Upload className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {selectedFile
                  ? selectedFile.name
                  : "Drop a PDF here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "PDF files up to 10MB"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>

            <Button
              onClick={handlePdfSubmit}
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? "Processing PDF..." : "Upload & Process"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {status.type === "success" && (
        <p className="mt-4 text-sm text-green-500">{status.message}</p>
      )}
      {status.type === "error" && (
        <p className="mt-4 text-sm text-destructive">{status.message}</p>
      )}
    </div>
  );
}
