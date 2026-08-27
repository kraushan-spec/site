import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(dir, "..", "public", "icons");

const icon = readFileSync(path.join(iconsDir, "icon.svg"));
const maskable = readFileSync(path.join(iconsDir, "icon-maskable.svg"));

async function main() {
  await sharp(icon).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
  await sharp(icon).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));
  await sharp(maskable).resize(512, 512).png().toFile(path.join(iconsDir, "icon-maskable-512.png"));
  await sharp(icon).resize(180, 180).png().toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("Icons generated.");
}

main();
