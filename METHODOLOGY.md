# Methodology

## Data source

Whoop API v2, personal data from 2025-10-05 to present (~244 days). Only `SCORED` records are used. Naps are excluded from sleep analysis. Where multiple records exist for the same calendar date, the latest record is kept.

---

## Stats

Five daily metrics characterize physiological state across distinct dimensions. SWS and REM are shown separately — they serve distinct functions and diverge meaningfully.

| Stat | Formula | What it captures |
|------|---------|-----------------|
| **Autonomic Recovery** | `100 × (hrv_today / 30d_rolling_mean_hrv)`, min_periods=7 | HRV relative to personal baseline — accounts for individual variation in absolute HRV values |
| **SWS %** | `sws_duration / (total_in_bed_time − total_awake_time) × 100` | Physical restoration: muscle repair, immune function, growth hormone release |
| **REM %** | `rem_duration / (total_in_bed_time − total_awake_time) × 100` | Cognitive restoration: emotional regulation, memory consolidation |
| **Load Ratio** | `strain / recovery_score` | Training demand relative to recovery capacity |
| **Stability** | `100 × (1 − cv)` where `cv = 14d_rolling_std / 14d_rolling_mean` of HRV, min_periods=7 | 14-day HRV consistency — longitudinal signal of physiological adaptation |

### References

- Plews et al. (2013). HRV in elite triathletes. *IJSPP* — HRV baseline normalization
- AASM normative data; Walker (2017) *Why We Sleep* — SWS/REM population norms
- Banister et al. (1975). A systems model of training. *Aus. J. Sports Medicine* — load/capacity framing
- Buchheit (2014). Monitoring training status with HR measures. *Frontiers in Physiology* — HRV CV as stability index

---

## Change-point detection

**Algorithm:** PELT (Pruned Exact Linear Time) with RBF cost function

**Input:** Raw HRV RMSSD, z-scored prior to fitting

**Why z-scored:** Standardizes the signal to mean=0, std=1 — makes the penalty parameter scale-invariant across users with different absolute HRV values.

**Why RBF:** Detects changes in both mean and variance, more appropriate for physiological data than L2 which detects mean shifts only.

**Penalty:** 3.0, selected empirically after sweeping 0.5–5.0. BIC penalty (log n ≈ 5.5) was too conservative — produced zero breakpoints. pen=3.0 produced three segments that map cleanly to biographical phases.

**Result:** 3 chapters — The Student (Oct–Dec), The Crash (Dec–Jan), Post-Grad (Jan–present). PELT recovered these phases from HRV alone with no biographical input.

---

## Chapter fingerprints

Each chapter is summarized by mean values of all metrics across its days: mean HRV, recovery score, SWS%, REM%, sleep efficiency, strain, and stability. HRV trend is classified as rising or declining based on whether the final day's HRV exceeds the first day's.

---

## Anomaly detection

Both signals are standardized to mean=0, std=1 before combining to equalize scale — recovery score (0–100) and autonomic recovery (unbounded, centered ~100) operate on different scales without standardization.

Composite signal: `composite = 0.5 × recovery_z + 0.5 × autonomic_z`

Method: z-score of composite against 30-day rolling mean and std — anomalies are relative to recent physiological state, not all-time average.

Thresholds: z > 1.5 = legendary day, z < −1.5 = boss fight (~top and bottom 7% of days relative to recent baseline).

---

## Limitations

- n=1: findings are personal, not generalizable
- PELT penalty chosen by empirical sweep, not cross-validated
- Chapter names are biographical — specific to this dataset
- HRV trend classification is based on first vs last day only
- Load Ratio is a simplification of Banister's full differential equation model
