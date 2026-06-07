"""
Whoop data processor.

Reads raw JSON from data/raw/, builds a clean master daily dataframe,
computes RPG stats, runs change-point detection, classifies health arc
chapters, and flags anomalies. Outputs to data/processed/.
"""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import ruptures as rpt
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path("data/raw")
PROCESSED_DATA_DIR = Path("data/processed")

def build_daily_dataframe() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load raw Whoop data, clean it, and return filtered daily dataframes.

    Returns:
        Tuple of (recovery_df, sleep_df, cycles_df), each sorted chronologically
        and filtered to SCORED records only.
    """
    logger.info("Loading raw data...")

    # load raw JSON
    with open(RAW_DATA_DIR / "recovery.json") as f:
        recovery_raw = json.load(f)
    with open(RAW_DATA_DIR / "sleep.json") as f:
        sleep_raw = json.load(f)
    with open(RAW_DATA_DIR / "cycles.json") as f:
        cycles_raw = json.load(f)

    # normalize to dataframes
    recovery_df = pd.json_normalize(recovery_raw)
    sleep_df = pd.json_normalize(sleep_raw)
    cycles_df = pd.json_normalize(cycles_raw)

    # filter to scored records only
    recovery_df = recovery_df[recovery_df["score_state"] == "SCORED"].copy()
    sleep_df = sleep_df[sleep_df["score_state"] == "SCORED"].copy()
    cycles_df = cycles_df[cycles_df["score_state"] == "SCORED"].copy()

    # filter out naps
    sleep_df = sleep_df[sleep_df["nap"] == False].copy()

    # parse timestamps
    recovery_df["date"] = pd.to_datetime(recovery_df["created_at"]).dt.date
    sleep_df["date"] = pd.to_datetime(sleep_df["created_at"]).dt.date
    sleep_df["start"] = pd.to_datetime(sleep_df["start"])
    sleep_df["end"] = pd.to_datetime(sleep_df["end"])
    cycles_df["date"] = pd.to_datetime(cycles_df["created_at"]).dt.date

    # sort chronologically
    recovery_df = recovery_df.sort_values("date").reset_index(drop=True)
    sleep_df = sleep_df.sort_values("date").reset_index(drop=True)
    cycles_df = cycles_df.sort_values("date").reset_index(drop=True)

    # deduplicate — keep the last record per date (handles timezone/cycle boundary edge cases)
    recovery_df = recovery_df.drop_duplicates(subset="date", keep="last")
    sleep_df = sleep_df.drop_duplicates(subset="date", keep="last")
    cycles_df = cycles_df.drop_duplicates(subset="date", keep="last")

    logger.info(f"Recovery: {len(recovery_df)} records")
    logger.info(f"Sleep: {len(sleep_df)} records")
    logger.info(f"Cycles: {len(cycles_df)} records")

    return recovery_df, sleep_df, cycles_df

def merge_daily(recovery_df: pd.DataFrame, sleep_df: pd.DataFrame, cycles_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge recovery, sleep, and cycle data into a single daily dataframe.

    Args:
        recovery_df: Cleaned recovery records.
        sleep_df: Cleaned sleep records.
        cycles_df: Cleaned cycle records.

    Returns:
        DataFrame with one row per day containing all metrics needed for stat computation.
    """
    # select only the columns we need from each source
    recovery_cols = recovery_df[[
        "date",
        "score.recovery_score",
        "score.hrv_rmssd_milli",
        "score.resting_heart_rate",
    ]].copy()

    sleep_cols = sleep_df[[
        "date",
        "start",
        "end",
        "score.stage_summary.total_in_bed_time_milli",
        "score.stage_summary.total_awake_time_milli",
        "score.stage_summary.total_slow_wave_sleep_time_milli",
        "score.stage_summary.total_rem_sleep_time_milli",
        "score.sleep_efficiency_percentage",
    ]].copy()

    cycles_cols = cycles_df[[
        "date",
        "score.strain",
    ]].copy()

    # compute stage percentages using true sleep time (in bed minus awake)
    sleep_cols["true_sleep_milli"] = (
        sleep_cols["score.stage_summary.total_in_bed_time_milli"] -
        sleep_cols["score.stage_summary.total_awake_time_milli"]
    )

    sleep_cols["sws_pct"] = (
        sleep_cols["score.stage_summary.total_slow_wave_sleep_time_milli"] /
        sleep_cols["true_sleep_milli"]
    ) * 100

    sleep_cols["rem_pct"] = (
        sleep_cols["score.stage_summary.total_rem_sleep_time_milli"] /
        sleep_cols["true_sleep_milli"]
    ) * 100

    # keep only derived columns and efficiency
    sleep_cols = sleep_cols[[
        "date",
        "sws_pct",
        "rem_pct",
        "score.sleep_efficiency_percentage",
    ]].copy()

    # rename all columns for clarity
    recovery_cols = recovery_cols.rename(columns={
        "score.recovery_score": "recovery_score",
        "score.hrv_rmssd_milli": "hrv",
        "score.resting_heart_rate": "rhr",
    })

    sleep_cols = sleep_cols.rename(columns={
        "score.sleep_efficiency_percentage": "sleep_efficiency",
    })

    cycles_cols = cycles_cols.rename(columns={
        "score.strain": "strain",
    })

    # merge all three on date
    daily_df = recovery_cols.merge(sleep_cols, on="date", how="left")
    daily_df = daily_df.merge(cycles_cols, on="date", how="left")

    # sort chronologically and reset index
    daily_df = daily_df.sort_values("date").reset_index(drop=True)

    logger.info(f"Daily dataframe: {len(daily_df)} rows, {len(daily_df.columns)} columns")
    logger.info(f"Columns: {daily_df.columns.tolist()}")

    return daily_df

def compute_stats(daily_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute five RPG stats for each day and add as new columns.

    Stats are documented in METHODOLOGY.md.

    Args:
        daily_df: Master daily dataframe from merge_daily().

    Returns:
        Same dataframe with five additional stat columns.
    """
    df = daily_df.copy()

    # 1. autonomic recovery — hrv relative to 30-day personal baseline
    df["hrv_baseline"] = df["hrv"].rolling(window=30, min_periods=7).mean()
    df["autonomic_recovery"] = df["hrv"] / df["hrv_baseline"] * 100

    # 2. sws % and rem % — already computed in merge_daily, no transformation needed
    # values are percentages of true sleep time, naturally bounded 0-100

    # 3. load ratio — strain relative to recovery capacity
    df["load_ratio"] = df["strain"] / df["recovery_score"]

    # 4. stability — 14-day coefficient of variation of hrv, inverted
    rolling_std = df["hrv"].rolling(window=14, min_periods=7).std()
    rolling_mean = df["hrv"].rolling(window=14, min_periods=7).mean()
    df["cv_hrv"] = rolling_std / rolling_mean
    df["stability"] = (1 - df["cv_hrv"]) * 100

    logger.info("RPG stats computed successfully")
    logger.info(f"Autonomic recovery range: {df['autonomic_recovery'].min():.1f} - {df['autonomic_recovery'].max():.1f}")
    logger.info(f"SWS % range: {df['sws_pct'].min():.1f} - {df['sws_pct'].max():.1f}")
    logger.info(f"REM % range: {df['rem_pct'].min():.1f} - {df['rem_pct'].max():.1f}")
    logger.info(f"Load ratio range: {df['load_ratio'].min():.1f} - {df['load_ratio'].max():.1f}")
    logger.info(f"Stability range: {df['stability'].min():.1f} - {df['stability'].max():.1f}")

    return df

def detect_chapters(daily_df: pd.DataFrame) -> list[dict]:
    """
    Detect health arc chapters using PELT change-point detection on z-scored HRV.

    Signal is z-scored for scale invariance across users.
    Penalty of 3.0 chosen empirically — produces physiologically and
    biographically meaningful segments. See METHODOLOGY.md.

    Args:
        daily_df: Master daily dataframe from compute_stats().

    Returns:
        List of chapter dictionaries with date ranges and metadata.
    """
    raw_signal = daily_df["hrv"].dropna().values
    raw_dates = daily_df["date"][daily_df["hrv"].notna()].values

    # z-score normalize
    z_signal = (raw_signal - raw_signal.mean()) / raw_signal.std()

    # fit PELT
    model = rpt.Pelt(model="rbf").fit(z_signal)
    bkps = model.predict(pen=3.0)

    chapter_names = {
        1: "The Student",
        2: "The Crash",
        3: "Post-Grad",
    }

    chapters = []
    prev = 0
    for i, bp in enumerate(bkps):
        start_date = pd.Timestamp(raw_dates[prev])
        end_date = pd.Timestamp(raw_dates[min(bp - 1, len(raw_dates) - 1)])
        chapters.append({
            "chapter": i + 1,
            "name": chapter_names.get(i + 1, f"Chapter {i + 1}"),
            "start_date": str(start_date)[:10],
            "end_date": str(end_date)[:10],
            "n_days": bp - prev,
            "start_idx": prev,
            "end_idx": bp,
        })
        prev = bp

    logger.info(f"Detected {len(chapters)} chapters")
    for c in chapters:
        logger.info(f"  {c['name']}: {c['start_date']} → {c['end_date']} ({c['n_days']} days)")

    return chapters

def compute_fingerprints(daily_df: pd.DataFrame, chapters: list[dict]) -> list[dict]:
    """
    Compute summary statistics for each chapter.

    For each detected chapter, computes mean values of all RPG stats
    and physiological metrics across the days in that segment.

    Args:
        daily_df: Master daily dataframe with RPG stats computed.
        chapters: Chapter list from detect_chapters().

    Returns:
        List of chapter dictionaries enriched with fingerprint statistics.
    """
    # assign chapter number to each day
    daily_df = daily_df.copy()
    daily_df["chapter"] = None

    for c in chapters:
        mask = (
            daily_df["date"] >= pd.Timestamp(c["start_date"]).date()) & (
            daily_df["date"] <= pd.Timestamp(c["end_date"]).date()
        )
        daily_df.loc[mask, "chapter"] = c["chapter"]

    # compute per-chapter summary statistics
    fingerprints = daily_df.groupby("chapter").agg(
        mean_hrv=("hrv", "mean"),
        mean_recovery=("recovery_score", "mean"),
        mean_sws=("sws_pct", "mean"),
        mean_rem=("rem_pct", "mean"),
        mean_sleep_efficiency=("sleep_efficiency", "mean"),
        mean_strain=("strain", "mean"),
        mean_stability=("stability", "mean"),
        hrv_trend=("hrv", lambda x: "rising" if x.iloc[-1] > x.iloc[0] else "declining"),
    
    ).reset_index()

    # merge fingerprints back into chapter list
    enriched = []
    for c in chapters:
        fp = fingerprints[fingerprints["chapter"] == c["chapter"]].iloc[0]
        enriched.append({
            **c,
            "mean_hrv": round(float(fp["mean_hrv"]), 1),
            "mean_recovery": round(float(fp["mean_recovery"]), 1),
            "mean_sws": round(float(fp["mean_sws"]), 1),
            "mean_rem": round(float(fp["mean_rem"]), 1),
            "mean_sleep_efficiency": round(float(fp["mean_sleep_efficiency"]), 1),
            "mean_strain": round(float(fp["mean_strain"]), 1),
            "mean_stability": round(float(fp["mean_stability"]), 1),
            "hrv_trend": fp["hrv_trend"],
        })

    logger.info("Chapter fingerprints computed")
    for c in enriched:
        logger.info(f"  {c['name']}: HRV {c['mean_hrv']}ms, recovery {c['mean_recovery']}%, trend {c['hrv_trend']}")

    return enriched

def detect_anomalies(daily_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Detect legendary days and boss fights using z-score on a composite signal.

    Composite signal combines recovery score and autonomic recovery, each
    standardized to zero mean and unit variance before combining.
    Z-score computed against a 30-day rolling baseline — anomalies are
    relative to recent physiological state, not all-time average.

    Args:
        daily_df: Master daily dataframe with RPG stats computed.

    Returns:
        Tuple of (legendary_df, boss_fights_df), each sorted by composite_z.
    """
    df = daily_df.copy()

    # standardize both signals before combining — equalizes scale
    recovery_z = (df["recovery_score"] - df["recovery_score"].mean()) / df["recovery_score"].std()
    autonomic_z = (df["autonomic_recovery"] - df["autonomic_recovery"].mean()) / df["autonomic_recovery"].std()

    # composite signal — equal weight of recovery and autonomic recovery
    df["composite"] = 0.5 * recovery_z + 0.5 * autonomic_z

    # z-score against 30-day rolling baseline
    rolling_mean = df["composite"].rolling(window=30, min_periods=7).mean()
    rolling_std = df["composite"].rolling(window=30, min_periods=7).std()
    df["composite_z"] = (df["composite"] - rolling_mean) / rolling_std

    # flag anomalies
    LEGENDARY_THRESHOLD = 1.5
    BOSS_THRESHOLD = -1.5

    legendary = df[df["composite_z"] > LEGENDARY_THRESHOLD].copy()
    boss_fights = df[df["composite_z"] < BOSS_THRESHOLD].copy()

    # sort — best days first, worst days first
    legendary = legendary.sort_values("composite_z", ascending=False)
    boss_fights = boss_fights.sort_values("composite_z", ascending=True)

    logger.info(f"Legendary days: {len(legendary)}")
    logger.info(f"Boss fights: {len(boss_fights)}")
    logger.info(f"Best day: {legendary.iloc[0]['date']} (z={legendary.iloc[0]['composite_z']:.2f})")
    logger.info(f"Worst day: {boss_fights.iloc[0]['date']} (z={boss_fights.iloc[0]['composite_z']:.2f})")

    return legendary, boss_fights

def main() -> None:
    """
    Run the full processing pipeline and save outputs to data/processed/.

    Pipeline:
        1. Load and clean raw data
        2. Merge into daily dataframe
        3. Compute RPG stats
        4. Detect health arc chapters via PELT
        5. Compute chapter fingerprints
        6. Detect legendary days and boss fights
        7. Save all outputs to data/processed/
    """
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # build daily dataframe
    recovery_df, sleep_df, cycles_df = build_daily_dataframe()
    daily_df = merge_daily(recovery_df, sleep_df, cycles_df)
    daily_df = compute_stats(daily_df)

    # detect chapters and compute fingerprints
    chapters = detect_chapters(daily_df)
    chapters = compute_fingerprints(daily_df, chapters)

    # detect anomalies
    legendary, boss_fights = detect_anomalies(daily_df)

    # convert date to string for JSON serialization
    daily_df["date"] = daily_df["date"].astype(str)
    legendary["date"] = legendary["date"].astype(str)
    boss_fights["date"] = boss_fights["date"].astype(str)

    # save daily data
    output_path = PROCESSED_DATA_DIR / "daily.json"
    daily_df.to_json(output_path, orient="records", indent=2)
    logger.info(f"Saved daily data → {output_path} ({len(daily_df)} rows)")

    # save chapters
    chapters_path = PROCESSED_DATA_DIR / "chapters.json"
    with open(chapters_path, "w") as f:
        json.dump(chapters, f, indent=2)
    logger.info(f"Saved chapters → {chapters_path} ({len(chapters)} chapters)")

    # save legendary days
    legendary_cols = [
        "date", "recovery_score", "hrv", "sws_pct", "rem_pct",
        "sleep_efficiency", "strain", "autonomic_recovery", "composite_z"
    ]
    legendary_path = PROCESSED_DATA_DIR / "legendary.json"
    with open(legendary_path, "w") as f:
        json.dump(legendary[legendary_cols].round(2).to_dict(orient="records"), f, indent=2)
    logger.info(f"Saved legendary days → {legendary_path} ({len(legendary)} days)")

    # save boss fights
    boss_path = PROCESSED_DATA_DIR / "boss_fights.json"
    with open(boss_path, "w") as f:
        json.dump(boss_fights[legendary_cols].round(2).to_dict(orient="records"), f, indent=2)
    logger.info(f"Saved boss fights → {boss_path} ({len(boss_fights)} days)")

    logger.info("Pipeline complete.")


if __name__ == "__main__":
    main()