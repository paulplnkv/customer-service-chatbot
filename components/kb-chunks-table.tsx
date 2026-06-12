"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/pas/delete-confirm-dialog";
import { deleteChunkAction } from "@/app/(internal)/kb/actions";
import { Trash2 } from "lucide-react";

type Chunk = {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type KbChunksTableProps = {
  chunks: Chunk[];
  currentPage: number;
  totalPages: number;
};

export function KbChunksTable({ chunks, currentPage, totalPages }: KbChunksTableProps) {
  const [selectedChunk, setSelectedChunk] = useState<Chunk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chunk | null>(null);

  function getSource(metadata: Record<string, unknown> | null) {
    if (!metadata) return "text";
    const source = metadata.source as string | undefined;
    return source ?? "text";
  }

  function getFilename(metadata: Record<string, unknown> | null) {
    if (!metadata) return null;
    return (metadata.filename as string | undefined) ?? null;
  }

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Content</TableHead>
            <TableHead className="w-[15%]">Source</TableHead>
            <TableHead className="w-[10%]">Size</TableHead>
            <TableHead className="w-[15%]">Date</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chunks.map((chunk) => (
            <TableRow
              key={chunk.id}
              className="cursor-pointer"
              onClick={() => setSelectedChunk(chunk)}
            >
              <TableCell className="truncate text-muted-foreground">
                {chunk.content.slice(0, 100)}
                {chunk.content.length > 100 && "…"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getSource(chunk.metadata)}</Badge>
                {getFilename(chunk.metadata) && (
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {getFilename(chunk.metadata)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {chunk.content.length}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(chunk.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(chunk);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          {currentPage > 1 ? (
            <Link
              href={`/kb?page=${currentPage - 1}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Previous
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={`/kb?page=${currentPage + 1}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Next
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={selectedChunk !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedChunk(null);
        }}
      >
        {selectedChunk && (
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chunk Detail</DialogTitle>
              <DialogDescription>
                ID: {selectedChunk.id} &middot;{" "}
                {new Date(selectedChunk.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium">Content</h3>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                  {selectedChunk.content}
                </pre>
              </div>

              {selectedChunk.metadata && (
                <div>
                  <h3 className="mb-1 text-sm font-medium">Metadata</h3>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    {JSON.stringify(selectedChunk.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(selectedChunk);
                    setSelectedChunk(null);
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Chunk"
        description="Are you sure you want to delete this knowledge base chunk? This action cannot be undone."
        onConfirm={async () => {
          if (!deleteTarget) return { success: false, error: "No target" };
          const result = await deleteChunkAction(deleteTarget.id);
          if (result.success) {
            if (selectedChunk?.id === deleteTarget.id) {
              setSelectedChunk(null);
            }
            setDeleteTarget(null);
          }
          return result;
        }}
      />
    </>
  );
}
