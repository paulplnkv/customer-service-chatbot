import { config } from "dotenv";
config({ path: ".env.local" });
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { generateImage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { CLAIM_ASSETS, dirFor, type ClaimAsset } from "./data/claim-assets";
import { renderTemplate } from "./lib/doc-templates";
import { toScannedPng, toDemoJpeg } from "./lib/paper";

// Generates the demo case-file assets described in scripts/data/claim-assets.ts:
// incident photos via the OpenAI image model, paperwork via code-rendered SVG
// templates rasterised with sharp. Existing files are skipped unless --force, so
// re-running is free and only new or changed assets cost anything.
//
//   npx tsx scripts/generate-claim-assets.ts [options]
//     --claim=STER-CLM-2026-0002   only this claim (repeatable)
//     --only=photos|docs           only one kind of asset
//     --force                      regenerate files that already exist
//     --dry-run                    print the plan and the cost estimate, then stop
//     --clean                      render documents without the scan artifacts
//     --model=gpt-image-1          image model override
//     --quality=low|medium|high    image quality (default medium)

type Options = {
  claims: string[];
  only: "photos" | "docs" | null;
  force: boolean;
  dryRun: boolean;
  clean: boolean;
  model: string;
  quality: "low" | "medium" | "high";
};

function parseArgs(argv: string[]): Options {
  const o: Options = {
    claims: [],
    only: null,
    force: false,
    dryRun: false,
    clean: false,
    model: "gpt-image-1",
    quality: "medium",
  };
  for (const arg of argv) {
    const [flag, value] = arg.split("=");
    switch (flag) {
      case "--claim":
        if (value) o.claims.push(value.toUpperCase());
        break;
      case "--only":
        if (value !== "photos" && value !== "docs") {
          throw new Error("--only must be 'photos' or 'docs'");
        }
        o.only = value;
        break;
      case "--force":
        o.force = true;
        break;
      case "--dry-run":
        o.dryRun = true;
        break;
      case "--clean":
        o.clean = true;
        break;
      case "--model":
        if (value) o.model = value;
        break;
      case "--quality":
        if (value !== "low" && value !== "medium" && value !== "high") {
          throw new Error("--quality must be 'low', 'medium' or 'high'");
        }
        o.quality = value;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return o;
}

// Rough per-image list price for gpt-image-1 at 1536x1024, for the estimate the
// script prints before spending anything. Not billing-accurate.
const COST_PER_IMAGE: Record<Options["quality"], number> = {
  low: 0.016,
  medium: 0.063,
  high: 0.25,
};

type PhotoAspect = "landscape" | "portrait" | "square";

const SIZE: Record<PhotoAspect, `${number}x${number}`> = {
  landscape: "1536x1024",
  portrait: "1024x1536",
  square: "1024x1024",
};

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function wanted(asset: ClaimAsset, only: Options["only"]) {
  if (!only) return true;
  return only === "photos" ? asset.source === "ai" : asset.source === "render";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const claimNumbers = Object.keys(CLAIM_ASSETS).filter(
    (c) => opts.claims.length === 0 || opts.claims.includes(c)
  );
  for (const c of opts.claims) {
    if (!CLAIM_ASSETS[c]) console.warn(`  ! unknown claim ${c} — not in the manifest`);
  }

  // Work out what actually needs doing before touching the network.
  type Job = { claimNumber: string; asset: ClaimAsset; out: string };
  const todo: Job[] = [];
  let skipped = 0;

  for (const claimNumber of claimNumbers) {
    const dir = dirFor(claimNumber);
    for (const asset of CLAIM_ASSETS[claimNumber]) {
      if (!wanted(asset, opts.only)) continue;
      const out = join(dir, asset.file);
      if (!opts.force && (await exists(out))) {
        skipped++;
        continue;
      }
      todo.push({ claimNumber, asset, out });
    }
  }

  const photos = todo.filter((j) => j.asset.source === "ai");
  const docs = todo.filter((j) => j.asset.source === "render");
  const estimate = photos.length * COST_PER_IMAGE[opts.quality];

  console.log(
    `Claims: ${claimNumbers.length} · to generate: ${photos.length} photo(s), ` +
      `${docs.length} document(s) · already on disk: ${skipped}`
  );
  if (photos.length > 0) {
    console.log(
      `Image model: ${opts.model} (${opts.quality}) · estimated cost ≈ $${estimate.toFixed(2)}\n`
    );
  } else {
    console.log("");
  }

  for (const job of todo) {
    console.log(`  ${job.asset.source === "ai" ? "photo" : " doc "}  ${job.out}`);
  }

  if (opts.dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }
  if (todo.length === 0) {
    console.log("Nothing to do. Pass --force to regenerate existing files.");
    return;
  }

  const openai = photos.length
    ? createOpenAI({ apiKey: requireEnv("OPENAI_API_KEY") })
    : null;

  const failures: { out: string; error: string }[] = [];
  console.log("");

  for (const claimNumber of claimNumbers) {
    const jobs = todo.filter((j) => j.claimNumber === claimNumber);
    if (jobs.length === 0) continue;
    await mkdir(dirFor(claimNumber), { recursive: true });
    console.log(`${claimNumber}`);

    for (const job of jobs) {
      try {
        const bytes =
          job.asset.source === "ai"
            ? await generatePhoto(openai!, opts, job.asset.prompt, job.asset.aspect)
            : await toScannedPng(renderTemplate(job.asset.data), {
                clean: opts.clean,
                seed: job.out,
              });
        await writeFile(job.out, bytes);
        console.log(`  ✓ ${job.asset.file}  (${(bytes.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push({ out: job.out, error: message });
        console.log(`  ✗ ${job.asset.file}  ${message}`);
      }
    }
  }

  if (failures.length > 0) {
    console.log(`\n${failures.length} asset(s) failed:`);
    for (const f of failures) console.log(`  ${f.out}: ${f.error}`);
    process.exitCode = 1;
  } else {
    console.log("\nDone.");
  }
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (expected in .env.local)`);
  return v;
}

async function generatePhoto(
  openai: ReturnType<typeof createOpenAI>,
  opts: Options,
  prompt: string,
  aspect: PhotoAspect = "landscape"
) {
  const result = await generateImage({
    model: openai.image(opts.model),
    prompt,
    size: SIZE[aspect],
    providerOptions: { openai: { quality: opts.quality } },
    maxRetries: 2,
  });
  return toDemoJpeg(Buffer.from(result.image.uint8Array));
}

main().catch((err) => {
  console.error("Asset generation failed:", err);
  process.exit(1);
});
