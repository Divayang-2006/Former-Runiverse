# Geometry Field Migration

The backend now persists modern geometry details for territories:

- `geometry`: GeoJSON polygon stored on each territory document.
- `processedPoints`: Sanitized polygon rings (each ring closes and has consecutive duplicates removed).
- `rawPoints`: Original points payload exactly as it arrived from the client (typically the recorded polyline).
- `area`: Calculated territory area in square meters.
- `perimeter`: Calculated loop perimeter in meters.

The feature flag `FEATURE_USE_NEW_GEOMETRY` controls whether the new sanitization pipeline runs. It defaults to `true`. Set it to `false` in the environment to fall back to the legacy coordinate handling without Turf-powered computations.

## Migration Script

Before running the one-time backfill, take a fresh backup and export the timestamp/id into `MIGRATION_BACKUP`. The script requires both `ALLOW_MIGRATION=1` and that backup marker to proceed.

Staging dry-run:

```
ALLOW_MIGRATION=1 MIGRATION_BACKUP="staging-backup-2025-12-09" npm run migrate:geometry -- --dry
```

Review the generated `migrated.json`, `failed.json`, and `migration-errors.log`. When ready to apply changes for real, drop the dry-run flag:

```
ALLOW_MIGRATION=1 MIGRATION_BACKUP="prod-backup-2025-12-09" npm run migrate:geometry -- --no-dry
```

The script processes only territories missing `geometry` or `area`, populates the modern fields, and writes a `geometry_migrated` flag once saved. Use `--limit N` during validation to inspect a small batch.
