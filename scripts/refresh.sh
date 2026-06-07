#!/bin/bash
# Fetch latest Whoop data and recompute all processed outputs.
# Run from the project root: bash scripts/refresh.sh

set -e  # exit immediately if any command fails

echo "Fetching latest Whoop data..."
python src/fetch.py

echo "Recomputing processed outputs..."
python src/process.py

echo "Done. Data is up to date."