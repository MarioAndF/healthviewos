import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openHumanRoot = resolve(
  repoRoot,
  process.env.OPENHUMAN_ROOT ?? "../../MedHue/openhuman",
);

async function copyFileDirectory(sourceDir, targetDir) {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  let copiedAssetCount = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    await cp(resolve(sourceDir, entry.name), resolve(targetDir, entry.name));
    copiedAssetCount += 1;
  }

  if (copiedAssetCount === 0) {
    throw new Error(`No OpenHuman atlas assets were found in ${sourceDir}.`);
  }

  return copiedAssetCount;
}

const runtimeCount = await copyFileDirectory(
  resolve(openHumanRoot, "apps/atlas/web/public/atlas"),
  resolve(repoRoot, "apps/web/public/openhuman/atlas"),
);
const metadataCount = await copyFileDirectory(
  resolve(openHumanRoot, "assets/metadata"),
  resolve(repoRoot, "assets/metadata"),
);
const structureCount = await copyFileDirectory(
  resolve(openHumanRoot, "assets/exports/metadata/systems"),
  resolve(repoRoot, "assets/exports/metadata/systems"),
);

console.log(
  `Synced OpenHuman atlas assets: ${runtimeCount} runtime, ${metadataCount} metadata, ${structureCount} structures.`,
);
