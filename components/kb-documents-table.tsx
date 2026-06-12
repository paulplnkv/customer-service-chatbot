"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/pas/delete-confirm-dialog";
import { deleteDocumentAction } from "@/app/(internal)/kb/actions";
import { Trash2, FileText, AlignLeft } from "lucide-react";

type KbDocument = {
  documentId: string | null;
  filename: string | null;
  source: string;
  chunkCount: number;
  createdAt: string;
};

type KbDocumentsTableProps = {
  documents: KbDocument[];
};

function getDisplayName(doc: KbDocument): string {
  if (doc.filename) return doc.filename;
  return "Text paste";
}

function getSourceLabel(source: string): string {
  if (source === "pdf") return "PDF";
  if (source === "kb-docx") return "DOCX";
  return "Text";
}

export function KbDocumentsTable({ documents }: KbDocumentsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<KbDocument | null>(null);

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Document</TableHead>
            <TableHead className="w-[15%]">Type</TableHead>
            <TableHead className="w-[15%]">Chunks</TableHead>
            <TableHead className="w-[15%]">Added</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc, i) => {
            const key = doc.documentId ?? `${doc.source}-${doc.filename ?? i}`;
            const name = getDisplayName(doc);
            const Icon = doc.filename ? FileText : AlignLeft;
            return (
              <TableRow key={key}>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium text-sm">{name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getSourceLabel(doc.source)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {doc.chunkCount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(doc.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(doc)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Document"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${getDisplayName(deleteTarget)}"? All ${deleteTarget.chunkCount} chunk${deleteTarget.chunkCount !== 1 ? "s" : ""} will be permanently removed.`
            : ""
        }
        onConfirm={async () => {
          if (!deleteTarget) return { success: false, error: "No target" };
          const result = await deleteDocumentAction({
            documentId: deleteTarget.documentId,
            filename: deleteTarget.filename,
            source: deleteTarget.source,
          });
          if (result.success) setDeleteTarget(null);
          return result;
        }}
      />
    </>
  );
}
