"""
Whoop OAuth authentication flow.

Starts a local server, opens the Whoop authorization page in the browser,
and exchanges the authorization code for access and refresh tokens.
Tokens are saved to data/tokens.json for reuse across sessions.
"""
# standard library (built-in Python modules) 
import json
import os
import webbrowser
from pathlib import Path
from urllib.parse import urlencode
import secrets

# third party (installed packages)
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
import requests
import uvicorn

load_dotenv() # reads .env file + loads everything in it into the environment

CLIENT_ID = os.getenv("WHOOP_CLIENT_ID")
CLIENT_SECRET = os.getenv("WHOOP_CLIENT_SECRET")
REDIRECT_URI = os.getenv("WHOOP_REDIRECT_URI")

WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"

SCOPES = [
    "read:profile",
    "read:recovery",
    "read:sleep",
    "read:workout",
    "read:cycles",
    "read:body_measurement",
    "offline", # includes a refresh token
]

TOKENS_FILE = Path("data/tokens.json")

STATE = secrets.token_urlsafe(16)

app = FastAPI()

def build_auth_url() -> str:
    """Build the Whoop authorization URL with required OAuth parameters."""

    scopes = " ".join(SCOPES)
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": scopes,
        "response_type": "code",
        "state": STATE,
    }
    return f"{WHOOP_AUTH_URL}?{urlencode(params)}"

@app.get("/callback")
def callback(code: str, state: str):
    """Handle the OAuth callback from Whoop and exchange code for tokens."""
    if state != STATE:
        return PlainTextResponse("State mismatch. Possible CSRF attack.", status_code=400)
    tokens = exchange_code_for_tokens(code)
    save_tokens(tokens)
    return PlainTextResponse("Authorization successful. You can close this tab.")

def exchange_code_for_tokens(code: str) -> dict:
    """Exchange a short-lived authorization code for access and refresh tokens."""
    response = requests.post(
        WHOOP_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    )
    response.raise_for_status() # automatically raises an error if the request failed
    return response.json()

def save_tokens(tokens: dict) -> None:
    """Save OAuth tokens to disk for reuse across sessions."""
    TOKENS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"Tokens saved to {TOKENS_FILE}")


def load_tokens() -> dict:
    """Load saved OAuth tokens from disk. Raises FileNotFoundError if auth has not been run."""
    if not TOKENS_FILE.exists():
        raise FileNotFoundError(
            "No tokens found. Run the auth flow first."
        )
    with open(TOKENS_FILE, "r") as f:
        return json.load(f)
    

def main():
    """Start the local server and open the Whoop authorization page."""
    auth_url = build_auth_url()
    print(f"Opening Whoop authorization page...")
    print(f"If your browser doesn't open automatically, visit:\n{auth_url}")
    webbrowser.open(auth_url)
    uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()