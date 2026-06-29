"""
Whoop RPG API.

FastAPI backend serving processed Whoop data to the frontend.
All data is pre-computed by src/process.py and served as static JSON.
"""

import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import os
from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

PROCESSED_DATA_DIR = Path("data/processed")

app = FastAPI(
    title="Whoop RPG API",
    description="Serves processed Whoop health data for the RPG visualization.",
    version="1.0.0",
)

# CORS middleware — allows the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "https://whoop-rpg.vercel.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

def load_json(filename: str) -> dict | list:
    """Load a processed JSON file from data/processed/."""
    path = PROCESSED_DATA_DIR / filename
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"{filename} not found. Run src/process.py first."
        )
    with open(path) as f:
        return json.load(f)


@app.get("/")
def root():
    """Health check."""
    return {"status": "ok", "message": "Whoop RPG API is running"}


@app.get("/daily")
def get_daily():
    """Return all daily metrics and RPG stats."""
    return load_json("daily.json")


@app.get("/chapters")
def get_chapters():
    """Return health arc chapters with fingerprints."""
    return load_json("chapters.json")


@app.get("/current")
def get_current():
    """Return the most recent day's stats for the current character display."""
    daily = load_json("daily.json")
    return daily[-1]  # last record is most recent

ARCHETYPE_SYSTEM = (Path(__file__).parent / "prompts" / "archetype.txt").read_text()



class ChatRequest(BaseModel):
    messages: list[dict]


@app.post("/archetype-chat")
async def archetype_chat(body: ChatRequest):
    """Stream an archetype assignment based on how the user describes feeling."""
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def generate():
        with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=ARCHETYPE_SYSTEM,
            messages=body.messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps(text)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)