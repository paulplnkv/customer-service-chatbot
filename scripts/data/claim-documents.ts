// Case documents (incident photos + paperwork) attached to demo claims, keyed by
// claim number — the rows the PAS seeders insert into claim_documents.
//
// This is DERIVED from scripts/data/claim-assets.ts, which is also what
// `npm run assets:claims` renders the files from. Edit the manifest, not this
// file, so a seeded URL can never point at a file the generator didn't write.
import { CLAIM_ASSETS, urlFor } from "./claim-assets";

export type SeedClaimDocument = {
  kind: "photo" | "document";
  title: string;
  url: string;
  docDate: string;
};

export const CLAIM_DOCUMENTS: Record<string, SeedClaimDocument[]> =
  Object.fromEntries(
    Object.entries(CLAIM_ASSETS).map(([claimNumber, assets]) => [
      claimNumber,
      assets.map((a) => ({
        kind: a.kind,
        title: a.title,
        url: urlFor(claimNumber, a.file),
        docDate: a.docDate,
      })),
    ])
  );
