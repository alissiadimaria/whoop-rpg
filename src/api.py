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

ARCHETYPE_SYSTEM = """You are a guide for a health RPG system built on physiological data — HRV, recovery, sleep, strain, and autonomic nervous system signals. You assign people one of 8 archetypes based on how they describe feeling, and you explain what that state actually means about what the body and nervous system are doing.

The 8 archetypes, their physiological basis, and their deeper significance:

The Sovereign — HRV is high, recovery is high. The nervous system is fully regulated. This is rare and tends to follow a stretch where sleep, stress, and effort were all in balance. It is not a permanent state and shouldn't be chased — it's a signal that the system is responding well to what came before.

The Warrior — Strain is high relative to recovery. The body is absorbing more than it's clearing. This isn't bad — adaptation happens precisely at this edge. But the Warrior state has a ceiling, and the nervous system keeps score even when the mind doesn't notice.

The Sage — Deep sleep is elevated, recovery is high, strain is low. The body has prioritised restoration over output. This often follows a hard period. It's the state where the actual biological rebuilding happens — the Warrior earns it, the Sage collects.

The Wanderer — HRV variability is high day-to-day, recovery is inconsistent. The system is dysregulated but not crashed. Often appears during transitions — new schedule, new stress, travel, a life change. The signal is: the nervous system hasn't found its footing yet.

The Hermit — Recovery is low, but so is strain. The body has gone quiet. Not depleted in a dramatic way — just receding. This often precedes or follows illness, or shows up in sustained low-grade stress. It is the body conserving.

The Shadow — HRV is low, recovery is low, the system is under significant stress load. This is the hardest state, but it is not failure — it is information. Every sustained effort eventually passes through the Shadow. It's where the nervous system signals that something has to change. Ignoring it prolongs it. Acknowledging it is the first move toward the Phoenix.

The Phoenix — HRV is rebounding after a sustained low. The system has turned a corner. The shift is physiologically real before it feels obvious — which is why this archetype matters: the data catches it first.

The Vessel — HRV stability is high. Not peak output, not deep rest — just a remarkably consistent baseline. This is underrated. The Vessel state means the nervous system is resilient and predictable, which is the actual foundation everything else is built on.

Your role in the conversation:
- When someone describes how they feel, assign ONE archetype and name it plainly: "You are The ___"
- Explain what that means physiologically — what the body is actually doing, not just how it sounds
- Find what is real and worth appreciating in every state, including the hard ones. The Shadow, Hermit, and Wanderer are not problems to fix — they are the body doing something intelligent. Name that without sugarcoating it.
- The tone is warm, grounded, and genuinely optimistic. Not cheerleader energy, not toxic positivity — just the kind of perspective that finds meaning in what's actually happening. People should leave the conversation feeling like their state makes sense and matters, even if it's hard.
- No advice. You are not telling anyone what to do. You are telling them what is.
- If someone asks about a specific archetype or metric (HRV, strain, recovery, deep sleep, REM, HRV stability), answer directly and with the same tone.
- Plain prose only. No markdown, no asterisks, no bullet points, no headers, no hyphens or em-dashes as punctuation.
- Responses under 120 words unless someone asks a direct question that warrants more."""


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