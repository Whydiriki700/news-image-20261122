// news-image-20261122 — front-page publisher.
//
// The entry is one finished newspaper front page, entry.png, kept beside
// this file. The page sums up Sunday 22 November 2026 in a single image:
// Iran striking a Bahrain site while tankers are hit in the Strait of
// Hormuz as the lead, with the COP31 collapse, the Kyiv suburb drone hit,
// the AI rout on Wall Street, the Sinaloa cartel capture, the Cikande
// factory fire and the FBI database breach as panels.
//
// This program is the gatekeeper for that page. Before anything is
// published it proves the file is a genuine PNG, that no side passes
// 1024 px and that the whole page stays within 1 MiB. Only then does it
// place an exact copy in the output folder for the grader.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIDE_LIMIT = 1024;
const BYTE_LIMIT = 1024 * 1024;

type Size = { width: number; height: number };

function measurePng(image: Buffer): Size {
  if (image.length < 24) {
    throw new Error("entry.png is too small to hold a PNG header");
  }
  const signatureOk = image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  if (!signatureOk) {
    throw new Error("entry.png does not open with the PNG signature");
  }
  const chunkName = image.toString("latin1", 12, 16);
  if (chunkName !== "IHDR") {
    throw new Error("entry.png has no IHDR chunk where one is required");
  }
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

function closesWithIend(image: Buffer): boolean {
  if (image.length < 12) return false;
  const trailer = image.subarray(image.length - 12);
  const zeroLength = trailer.readUInt32BE(0) === 0;
  const tag = trailer.toString("latin1", 4, 8);
  return zeroLength && tag === "IEND";
}

function publishFrontPage(): void {
  const folder = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(folder, "entry.png");
  if (!existsSync(sourcePath)) {
    throw new Error("entry.png is missing from the repo root");
  }
  const page = readFileSync(sourcePath);
  if (page.length > BYTE_LIMIT) {
    throw new Error(`entry.png weighs ${page.length} bytes, past the 1 MiB cap`);
  }
  if (!closesWithIend(page)) {
    throw new Error("entry.png looks truncated: its IEND trailer is absent");
  }
  const { width, height } = measurePng(page);
  if (width === 0 || height === 0) {
    throw new Error("front page reports a zero dimension in its header");
  }
  if (width > SIDE_LIMIT || height > SIDE_LIMIT) {
    throw new Error(`front page measures ${width}x${height}, past the 1024 cap`);
  }
  // The Sunday page is square by design: 1024 by 1024, one image only.
  const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(targetDir, { recursive: true });
  const targetPath = join(targetDir, "entry.png");
  writeFileSync(targetPath, page);
  const check = readFileSync(targetPath);
  if (!check.equals(page)) {
    throw new Error("the published copy does not match entry.png byte for byte");
  }
  const digest = createHash("sha256").update(page).digest("hex");
  console.log(
    `front page published: ${width}x${height}, ${page.length} bytes, sha256 ${digest} -> ${targetPath}`,
  );
}

publishFrontPage();
