"""
Whoop data fetcher.

Fetches all available data from the Whoop API for the authenticated user
and saves it as raw JSON to data/raw/. Handles pagination automatically
and refreshes the access token if expired.
"""

import json
import logging
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

from auth import load_tokens, save_tokens

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://api.prod.whoop.com/developer"
RAW_DATA_DIR = Path("data/raw")
TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"

def refresh_access_token() -> dict:
    """Refresh the access token using the refresh token and save updated tokens to disk."""
    tokens = load_tokens()
    
    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": tokens["refresh_token"],
            "client_id": os.getenv("WHOOP_CLIENT_ID"),
            "client_secret": os.getenv("WHOOP_CLIENT_SECRET"),
        },
    )
    response.raise_for_status()
    
    new_tokens = response.json()
    save_tokens(new_tokens)
    logger.info("Access token refreshed successfully")
    return new_tokens

def make_request(endpoint: str) -> dict:
    """Make an authenticated GET request to the Whoop API.
    
    Automatically refreshes the access token if it has expired.
    
    Args:
        endpoint: API endpoint path, e.g. '/v2/recovery'
    
    Returns:
        Parsed JSON response as a dictionary.
    """
    tokens = load_tokens()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    url = f"{BASE_URL}{endpoint}"
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 401:
        logger.info("Access token expired, refreshing...")
        tokens = refresh_access_token()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        response = requests.get(url, headers=headers)
    
    response.raise_for_status()
    return response.json()

def fetch_all_pages(endpoint: str) -> list:
    """Fetch all pages of a paginated Whoop API endpoint.
    
    Continues fetching until there are no more pages.
    
    Args:
        endpoint: API endpoint path, e.g. '/v2/recovery'
    
    Returns:
        List of all records across all pages.
    """
    all_records = []
    next_token = None
    page = 1

    while True:
        paginated_endpoint = endpoint
        if next_token:
            paginated_endpoint = f"{endpoint}?nextToken={next_token}"
        
        logger.info(f"Fetching {endpoint} — page {page}")
        response = make_request(paginated_endpoint)
        
        records = response.get("records", [])
        all_records.extend(records)
        
        next_token = response.get("next_token")
        
        if not next_token:
            break
            
        page += 1
        time.sleep(0.5)

    logger.info(f"Fetched {len(all_records)} total records from {endpoint}")
    return all_records


def fetch_all_data() -> None:
    """Fetch all Whoop data for the authenticated user and save to data/raw/."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    endpoints = {
        "recovery": "/v2/recovery",
        "sleep": "/v2/activity/sleep",
        "workouts": "/v2/activity/workout",
        "cycles": "/v2/cycle",
    }

    for name, endpoint in endpoints.items():
        logger.info(f"Starting fetch for {name}...")
        records = fetch_all_pages(endpoint)
        output_path = RAW_DATA_DIR / f"{name}.json"
        with open(output_path, "w") as f:
            json.dump(records, f, indent=2)
        logger.info(f"Saved {len(records)} {name} records to {output_path}")

    logger.info("Fetching profile...")
    profile = make_request("/v2/user/profile/basic")
    with open(RAW_DATA_DIR / "profile.json", "w") as f:
        json.dump(profile, f, indent=2)

    logger.info("Fetching body measurements...")
    body = make_request("/v2/user/measurement/body")
    with open(RAW_DATA_DIR / "body.json", "w") as f:
        json.dump(body, f, indent=2)

    logger.info("All data fetched successfully.")


if __name__ == "__main__":
    fetch_all_data()