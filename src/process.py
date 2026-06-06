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


def main() -> None:
    """
    Run the full processing pipeline and save outputs to data/processed/.
    """
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # build, merge, compute
    recovery_df, sleep_df, cycles_df = build_daily_dataframe()
    daily_df = merge_daily(recovery_df, sleep_df, cycles_df)
    daily_df = compute_stats(daily_df)

    # convert date to string for JSON serialization
    daily_df["date"] = daily_df["date"].astype(str)

    # save to processed
    output_path = PROCESSED_DATA_DIR / "daily.json"
    daily_df.to_json(output_path, orient="records", indent=2)
    logger.info(f"Saved daily data to {output_path}")
    logger.info(f"Final shape: {daily_df.shape}")
    logger.info(f"Columns: {daily_df.columns.tolist()}")


if __name__ == "__main__":
    main()