"use client";

import { useState } from "react";
import { FileText, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ClaimDocument = {
  id: string;
  kind: string;
  title: string;
  url: string;
  docDate: string | null;
};

// docDate is a date-only value ("2026-06-18"). Passing that straight to `new Date`
// parses it as UTC midnight, which formats as the previous day in any timezone
// behind UTC — so build the date from its parts and keep it local.
function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClaimDocumentsDialog({
  open,
  onOpenChange,
  claimNumber,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimNumber: string;
  documents: ClaimDocument[];
}) {
  const photos = documents.filter((d) => d.kind === "photo");
  const files = documents.filter((d) => d.kind !== "photo");

  // Index into `documents` for the enlarged view, or null when closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const active = lightboxIndex === null ? null : documents[lightboxIndex];

  function step(delta: number) {
    setLightboxIndex((i) => {
      if (i === null) return i;
      return (i + delta + documents.length) % documents.length;
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setLightboxIndex(null);
          onOpenChange(v);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Case documents</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{claimNumber}</span> · {photos.length}{" "}
              photo{photos.length !== 1 && "s"}, {files.length} document
              {files.length !== 1 && "s"}
            </DialogDescription>
          </DialogHeader>

          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No documents on file for this claim.
            </p>
          ) : (
            <div className="space-y-5">
              {photos.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ImageIcon className="size-3.5" />
                    Incident photos
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLightboxIndex(documents.indexOf(p))}
                        className="group overflow-hidden rounded-md border border-border text-left transition-colors hover:border-foreground/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={p.title}
                          className="aspect-4/3 w-full bg-muted object-cover transition-transform group-hover:scale-[1.03]"
                        />
                        <div className="p-2">
                          <div className="truncate text-xs font-medium">
                            {p.title}
                          </div>
                          <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                            {fmtDate(p.docDate)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {files.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="size-3.5" />
                    Documents
                  </div>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {f.title}
                            </div>
                            <div className="text-xs tabular-nums text-muted-foreground">
                              {fmtDate(f.docDate)}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLightboxIndex(documents.indexOf(f))}
                        >
                          View
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enlarged view */}
      <Dialog
        open={active !== null}
        onOpenChange={(v) => {
          if (!v) setLightboxIndex(null);
        }}
      >
        {active && (
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {active.title}
                <Badge variant="secondary">{active.kind}</Badge>
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono">{claimNumber}</span> ·{" "}
                {fmtDate(active.docDate)}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-md border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.title}
                className="max-h-[62vh] w-full object-contain"
              />
            </div>

            {documents.length > 1 && (
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(lightboxIndex ?? 0) + 1} of {documents.length}
                </span>
                <Button size="sm" variant="outline" onClick={() => step(1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
