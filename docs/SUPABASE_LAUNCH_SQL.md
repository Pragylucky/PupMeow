# Supabase SQL before / after launch

Run each file in **SQL Editor** if it is not already applied (check **Database → Migrations** or `supabase_migrations.schema_migrations`).

| Order | File | Purpose |
|------:|------|---------|
| 1 | `20261021000002_ensure_admin_audit_log.sql` | Admin audit table + hide/delete RPCs |
| 2 | `20261024000000_content_integrity_contact_limits.sql` | No-sale + own-photo triggers; contact reveal limits |
| 3 | `20261024000001_lost_sighting_limits.sql` | “I saw your pet” rate limits + banned users |

If **GitHub “Supabase Preview”** fails with migration history drift: in the Supabase dashboard, repair history so local migration names match what ran, or run the idempotent SQL files above manually and mark versions as applied.

**Older RPCs** (only if sightings never worked): `20261011001500_admin_audit_sightings.sql` defines the original `report_lost_sighting` — step 3 replaces that function.
