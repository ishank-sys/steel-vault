Migration: steel-vault v1 -> v2

**Scope:** This ARD describes the planned migration of the steel-vault
application infrastructure from the current v1 setup (mixed S3, VM volumes,
GCS VM, and Supabase) to the v2 target architecture (application and Postgres on
a single DigitalOcean Droplet using DigitalOcean Volumes for Postgres data; GCS
as object storage for file uploads). It includes assumptions, requirements,
architecture, migration steps, rollback, risks, and a cost comparison (Dec 2025).

**Audience:** DevOps, Engineering lead, Product manager, Finance

## 1. Executive summary

Current v1:

- Object storage: AWS S3 and Google Cloud Storage used in different parts of
  the system.
- Compute: a mix of cloud VMs (GCS VM historically referenced) and other
  provider VMs.
- Block/volume storage: provider-managed volumes attached to VMs.
- Postgres: Supabase-managed Postgres (managed service).

Target v2:

- Object storage: consolidate to Google Cloud Storage (use S3-compatible
  endpoints where needed) for all file uploads.
- Compute & block storage: DigitalOcean Droplet(s) for application compute and
  DigitalOcean Volumes for Postgres data.
- Postgres: self-hosted Postgres on the same Droplet (data stored on attached
  DigitalOcean Volume).

Goals: reduce monthly managed DB costs, simplify provider footprint (GCS +
DigitalOcean), and retain acceptable operational risk for now.

High-level tradeoffs:

- Benefits: lower baseline hosting cost at small–medium scale, simplified
  billing, direct control of DB tuning and backups.
- Drawbacks: added operational burden (DB maintenance, backups, upgrades),
  increased single-point-of-failure risk unless HA is introduced, potential
  network egress/latency differences between DO and GCS.

## 2. Assumptions

- The application can run on a single Droplet initially.
- The team will operate Postgres (backups, patching, tuning) for the near
  future.
- GCS remains available and acceptable as the S3-compatible object backend.
- We will choose DO and GCS regions to minimize network latency and egress
  costs.

## 3. Requirements

Functional

- Continuous availability of uploads and downloads during low-impact
  maintenance where possible.
- Successful migration of Postgres data with minimal downtime (target
  maintenance window < 30 minutes; exact RTO/RPO to be agreed).

Non-functional

- Cost: achieve lower monthly spend vs current Supabase + mixed cloud costs
  for comparable capacity.
- Security: Postgres and Droplet follow best practices; data at rest and in
  transit encrypted where feasible.
- Observability: logging, monitoring, and backups in place before cutover.

## 4. Target architecture (text diagram)

    [Users]
    	 |
    Internet
    	 |
    [DigitalOcean Droplet]
    	 |- Application (Next.js / API)
    	 |- Postgres (local) -> data directory mounted on DigitalOcean Volume
    	 |- Workers / Cron jobs
    	 |
    (Object store) -> Google Cloud Storage (S3-compatible bucket)

Notes:

- Postgres data directory (e.g. `/var/lib/postgresql/data`) lives on a DO
  Volume for persistence and snapshots.
- GCS is used for uploads; app may issue signed URLs to allow client direct
  upload to GCS to reduce Droplet egress and CPU load.

## 10. Cost comparison (Dec 2025 snapshot)

Methodology and baseline assumptions (monthly):

- App compute: single Droplet (2 vCPU / 4GB) or equivalent.
- Postgres storage: 200 GB active database.
- Object storage: 500 GB stored in GCS; 1 TB egress per month.
- Backups and snapshots minimal retention used in cost examples.

Notes: pricing below is illustrative using public list prices gathered Dec 2025
from provider pricing pages. Exact bills depend on region, usage patterns,
reserved/committed discounts, and negotiated enterprise pricing.

v1 (representative mixed setup):

- Supabase managed Postgres: Pro plan base $25/month, but production compute
  - DB sizing commonly adds compute credits or larger compute instances. A
    realistic small production estimate: $60/month compute + $25 plan => ~$85/month
    (conservative baseline). With larger DB compute tiers this increases
    significantly.
- Object storage on GCS S3 (500 GB stored): ~ $11.50/month for storage (S3
  Standard) + egress ~ $100-$120 for 1 TB egress => ~ $130/month.
- App compute on GCE/other VMs: small VM ~$24-$35/month.

Estimated v1 total (illustrative): ~$265/month.

v2 (DigitalOcean Droplet + GCS):

- DigitalOcean Droplet (production-sized): choose $24/month (2 vCPU / 4GB)
  conservative production plan.
- DigitalOcean Volume (200 GB): DO volume pricing commonly: 100 GiB = $10 =>
  $0.10/GB-month -> 200 GB = $20/month.
- DO snapshot/backup small cost: ~$5/month (depends on retention & size).
- Google Cloud Storage (500 GB): ~$10/month storage (Standard) + egress ~
  $120 for 1 TB egress (varies) => ~$130/month for storage+egress.

Estimated v2 total (illustrative): Droplet $24 + Volume $20 + snapshots $5 +
GCS storage/egress $130 = ~$179/month.

Estimated delta: v2 ~$179 vs v1 ~$265 => savings ~$86/month (~32% lower)
for this illustrative baseline.

Key cost sensitivities:

- Egress dominates costs in both models where large file downloads exist.
- Supabase managed tiers with larger dedicated compute can be more costly;
  if Supabase costs are high, savings from self-hosting increase but so does
  operational risk.
- DigitalOcean bandwidth allowances and egress overages (e.g., $0.01/GB) and
  Google egress pricing vary by destination and region; validate region
  selection.

Sources (Dec 2025):

- DigitalOcean pricing: https://www.digitalocean.com/pricing/ and
  https://www.digitalocean.com/pricing/volumes/
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Supabase pricing: https://supabase.com/pricing
