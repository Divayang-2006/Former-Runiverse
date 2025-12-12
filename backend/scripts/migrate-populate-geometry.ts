import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import mongoose, { type FilterQuery } from "mongoose";
import dotenv from "dotenv";

import Territory, {
  type CoordinateTuple,
  type PolygonRings,
  type TerritoryDocument,
  type ITerritory,
} from "../src/models/Territory.js";
import { computeAreaPerimeterFromRings, sanitizePolygonRings } from "../src/utils/geometry.js";

dotenv.config();

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  showHelp: boolean;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  let dryRun = true;
  let limit: number | undefined;
  let showHelp = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      showHelp = true;
      break;
    }

    if (arg === "--dry") {
      dryRun = true;
      continue;
    }

    if (arg === "--no-dry" || arg === "--apply") {
      dryRun = false;
      continue;
    }

    if (arg.startsWith("--dry=")) {
      const [, rawValue] = arg.split("=");
      const lowered = (rawValue ?? "").toLowerCase();
      dryRun = !(lowered === "false" || lowered === "0" || lowered === "no");
      continue;
    }

    if (arg === "--limit") {
      const next = argv[i + 1];
      if (next) {
        limit = parseInt(next, 10);
        i += 1;
      }
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const [, rawValue] = arg.split("=");
      if (rawValue) {
        limit = parseInt(rawValue, 10);
      }
    }
  }

  return { dryRun, limit, showHelp };
};

interface MigratedRecord {
  id: string;
  source: string;
  area: number;
  perimeter: number;
  dryRun: boolean;
}

interface FailedRecord {
  id: string;
  reason: string;
  source?: string;
}

type ConsoleLike = Pick<typeof console, "log" | "warn" | "error">;

export interface GeometryMigrationOptions {
  dryRun?: boolean;
  limit?: number;
  connectionUri?: string;
  allowMigration?: string;
  backupId?: string;
  migratedPath?: string;
  failedPath?: string;
  errorLogPath?: string;
  outputDir?: string;
  resetOutputFiles?: boolean;
  logger?: ConsoleLike;
  skipValidation?: boolean;
}

export interface GeometryMigrationSummary {
  processed: number;
  migrated: number;
  failed: number;
  dryRun: boolean;
  limit?: number;
  migratedRecords: MigratedRecord[];
  failedRecords: FailedRecord[];
  paths: MigrationPaths;
}

const resolvePaths = (options: GeometryMigrationOptions): MigrationPaths => {
  const baseDir = options.outputDir ? path.resolve(options.outputDir) : process.cwd();
  return {
    migratedPath: options.migratedPath ? path.resolve(options.migratedPath) : path.resolve(baseDir, "migrated.json"),
    failedPath: options.failedPath ? path.resolve(options.failedPath) : path.resolve(baseDir, "failed.json"),
    errorLogPath: options.errorLogPath ? path.resolve(options.errorLogPath) : path.resolve(baseDir, "migration-errors.log"),
  };
};

const resetOutputsIfNeeded = (paths: MigrationPaths, shouldReset: boolean | undefined) => {
  if (shouldReset === false) {
    return;
  }
  resetFileSync(paths.migratedPath);
  resetFileSync(paths.failedPath);
  resetFileSync(paths.errorLogPath);
};

const validateEnvironment = (options: GeometryMigrationOptions) => {
  if (options.skipValidation) {
    return;
  }

  const allowMigration = options.allowMigration ?? process.env.ALLOW_MIGRATION;
  if (allowMigration !== "1") {
    throw new Error("ALLOW_MIGRATION=1 is required to run this script.");
  }

  const backupId = options.backupId ?? process.env.MIGRATION_BACKUP;
  if (!backupId || !backupId.trim()) {
    throw new Error("MIGRATION_BACKUP must be set to the timestamp/id of the database snapshot.");
  }

  const mongoUri = options.connectionUri ?? process.env.MONGO_URI;
  if (!mongoUri || !mongoUri.trim()) {
    throw new Error("MONGO_URI must be provided in the environment.");
  }
};

interface MigrationPaths {
  migratedPath: string;
  failedPath: string;
  errorLogPath: string;
}

const ensureDirectorySync = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const resetFileSync = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
};

const logErrorSync = (paths: MigrationPaths, message: string) => {
  const line = `${new Date().toISOString()} ${message}\n`;
  ensureDirectorySync(paths.errorLogPath);
  fs.appendFileSync(paths.errorLogPath, line, { encoding: "utf8" });
};

const cloneDeep = <T>(value: T, onError: (message: string) => void): T => {
  try {
    return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    onError(`clone-deep failed: ${(error as Error).message}`);
    return value;
  }
};

type ConversionResult = {
  sanitized: PolygonRings;
  raw: unknown;
  source: string;
};

type LegacyTerritorySnapshot = {
  geometry?: { coordinates?: unknown } | null;
  location?: { coordinates?: unknown } | null;
  processedPoints?: unknown;
  rawPoints?: unknown;
  metrics?: {
    points?: unknown;
    rawPoints?: unknown;
    shape?: unknown;
  } | null;
};

const toCoordinateTuple = (value: unknown): CoordinateTuple | null => {
  if (Array.isArray(value) && value.length >= 2) {
    const lon = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat];
    }
    return null;
  }

  if (value && typeof value === "object") {
    const point = value as Record<string, unknown>;
    const lonRaw = point.longitude ?? point.lon ?? point.lng ?? point.x;
    const latRaw = point.latitude ?? point.lat ?? point.y;

    if (lonRaw === undefined || latRaw === undefined) {
      return null;
    }

    const lon = Number(lonRaw);
    const lat = Number(latRaw);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat];
    }
  }

  return null;
};

const normalizePointCollection = (collection: unknown): CoordinateTuple[] => {
  if (!Array.isArray(collection)) {
    return [];
  }

  const result: CoordinateTuple[] = [];
  for (const entry of collection) {
    const tuple = toCoordinateTuple(entry);
    if (tuple) {
      result.push(tuple);
    }
  }
  return result;
};

const convertCandidateToRings = (candidate: unknown): PolygonRings | null => {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return null;
  }

  const first = candidate[0];

  if (Array.isArray(first) && first.length > 0 && Array.isArray(first[0])) {
    const rings: PolygonRings = [];
    for (const item of candidate) {
      const ring = normalizePointCollection(item);
      if (ring.length > 0) {
        rings.push(ring);
      }
    }
    return rings.length > 0 ? rings : null;
  }

  const ring = normalizePointCollection(candidate);
  return ring.length > 0 ? [ring] : null;
};

const convertLegacyToRings = (territory: TerritoryDocument): ConversionResult | null => {
  const legacy = territory.toObject({ virtuals: false, getters: false }) as unknown as LegacyTerritorySnapshot;

  const candidates: Array<{ value: unknown; source: string }> = [
    { value: legacy.geometry?.coordinates, source: "geometry.coordinates" },
    { value: legacy.location?.coordinates, source: "location.coordinates" },
    { value: legacy.processedPoints, source: "processedPoints" },
    { value: legacy.rawPoints, source: "rawPoints" },
    { value: legacy.metrics?.points, source: "metrics.points" },
    { value: legacy.metrics?.rawPoints, source: "metrics.rawPoints" },
    { value: legacy.metrics?.shape, source: "metrics.shape" },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) {
      continue;
    }

    const converted = convertCandidateToRings(candidate.value);
    if (!converted) {
      continue;
    }

    const sanitized = sanitizePolygonRings(converted);
    if (!sanitized || sanitized.length === 0 || sanitized.some((ring) => ring.length < 4)) {
      continue;
    }

    return {
      sanitized,
      raw: candidate.value,
      source: candidate.source,
    };
  }

  return null;
};

const writeOutputFiles = async (paths: MigrationPaths, migrated: MigratedRecord[], failed: FailedRecord[], dryRun: boolean) => {
  await fs.promises.mkdir(path.dirname(paths.migratedPath), { recursive: true });
  await fs.promises.mkdir(path.dirname(paths.failedPath), { recursive: true });

  await fs.promises.writeFile(
    paths.migratedPath,
    JSON.stringify({ dryRun, migrated }, null, 2),
    { encoding: "utf8" }
  );
  await fs.promises.writeFile(
    paths.failedPath,
    JSON.stringify(failed, null, 2),
    { encoding: "utf8" }
  );
};

export const runGeometryMigration = async (
  rawOptions: GeometryMigrationOptions = {}
): Promise<GeometryMigrationSummary> => {
  validateEnvironment(rawOptions);

  const paths = resolvePaths(rawOptions);
  resetOutputsIfNeeded(paths, rawOptions.resetOutputFiles);

  const logger: ConsoleLike = rawOptions.logger ?? console;
  const dryRun = rawOptions.dryRun ?? true;
  const limit = rawOptions.limit;
  const mongoUri = rawOptions.connectionUri ?? process.env.MONGO_URI ?? "";

  logger.log(`[migration] Starting geometry population script (dryRun=${dryRun}).`);

  await mongoose.connect(mongoUri);

  const filter: FilterQuery<ITerritory> = {
    $or: [
      { geometry: { $exists: false } },
      { geometry: null },
      { area: { $exists: false } },
      { area: null },
    ],
  };

  const cursor = Territory.find(filter).cursor();

  const migratedRecords: MigratedRecord[] = [];
  const failedRecords: FailedRecord[] = [];

  let processed = 0;
  let migratedCount = 0;
  let failedCount = 0;

  try {
    for await (const docRaw of cursor) {
      const doc = docRaw as TerritoryDocument;
      if (limit !== undefined && processed >= limit) {
        logger.log(`[migration] Limit ${limit} reached, stopping iteration.`);
        break;
      }

      processed += 1;
      const id = doc._id.toString();

      try {
        const conversion = convertLegacyToRings(doc);

        if (!conversion) {
          const reason = "No legacy shape data found";
          logger.warn(`[migration] Skipping ${id}: ${reason}`);
          failedRecords.push({ id, reason });
          failedCount += 1;
          continue;
        }

        const { sanitized, raw, source } = conversion;
        const metrics = computeAreaPerimeterFromRings(sanitized);

        const rawForStorage = cloneDeep(raw ?? sanitized, (message) => {
          logErrorSync(paths, message);
        });

        if (!dryRun) {
          doc.set({
            geometry: { type: "Polygon", coordinates: sanitized },
            processedPoints: sanitized,
            rawPoints: rawForStorage,
            area: metrics.area,
            perimeter: metrics.perimeter,
            geometry_migrated: true,
          });
          doc.markModified("geometry");
          doc.markModified("processedPoints");
          doc.markModified("rawPoints");
          await doc.save();
        }

        migratedRecords.push({
          id,
          source,
          area: metrics.area,
          perimeter: metrics.perimeter,
          dryRun,
        });
        migratedCount += 1;

        logger.log(
          `[migration] ${dryRun ? "[DRY-RUN]" : "[APPLIED]"} ${id} from ${source} | area=${metrics.area.toFixed(
            2
          )} sqm perimeter=${metrics.perimeter.toFixed(2)} m`
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const reason = err.message || "Unknown error";
        logger.error(`[migration] Failed to process ${id}: ${reason}`);
        logErrorSync(paths, `Failed to process ${id}: ${reason}`);
        failedRecords.push({ id, reason });
        failedCount += 1;
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  await writeOutputFiles(paths, migratedRecords, failedRecords, dryRun);

  logger.log("[migration] Summary:");
  logger.log(`  Processed: ${processed}`);
  logger.log(`  Migrated: ${migratedCount}`);
  logger.log(`  Failed:   ${failedCount}`);
  logger.log(`  Dry-run:  ${dryRun}`);
  logger.log(`  Output:   ${paths.migratedPath}`);
  logger.log(`  Failures: ${paths.failedPath}`);
  logger.log(`  Errors:   ${paths.errorLogPath}`);

  return {
    processed,
    migrated: migratedCount,
    failed: failedCount,
    dryRun,
    limit,
    migratedRecords,
    failedRecords,
    paths,
  };
};

const printHelp = (): void => {
  console.log(`Usage: npm run migrate:geometry [-- --dry] [-- --no-dry] [-- --limit N]

Flags:
  --dry        Run without saving (default)
  --no-dry     Apply changes to the database
  --limit N    Only inspect the first N matching documents
  --help       Show this message
`);
};

const isCliInvocation = (): boolean => {
  try {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const currentFile = fileURLToPath(import.meta.url);
    return entry === path.resolve(currentFile);
  } catch {
    return false;
  }
};

if (isCliInvocation()) {
  const cliOptions = parseCliOptions(process.argv.slice(2));

  if (cliOptions.showHelp) {
    printHelp();
    process.exit(0);
  }

  runGeometryMigration({
    dryRun: cliOptions.dryRun,
    limit: cliOptions.limit,
  })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      try {
        logErrorSync(resolvePaths({}), `Fatal error: ${err.message}`);
      } catch (logError) {
        console.error("[migration] Failed to write error log:", logError);
      }
      console.error("[migration] Fatal error", err);
      process.exit(1);
    });
}
