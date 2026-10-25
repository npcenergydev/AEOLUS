import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import httpx
import pandas as pd
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class ElexonClient:
    """
    Elexon BMRS client for retrieving FUELHH actuals and WINDFOR forecasts.
    Features:
    - In-memory DataFrame caching
    - File persistence caching
    - Chunked date range streaming
    - Automatic deduplication and normalization
    """

    def __init__(self, cache_file: Optional[Path] = None):
        self.cache_file = cache_file or settings.CACHE_FILE
        self._df_actuals: Optional[pd.DataFrame] = None
        self._df_forecasts: Optional[pd.DataFrame] = None
        self._initialized = False

    def initialize(self, force_refresh: bool = False) -> None:
        """Load data from cache file or fetch from API."""
        if self._initialized and not force_refresh:
            return

        if not force_refresh and self.cache_file.exists():
            try:
                self._load_from_cache_file()
                self._initialized = True
                logger.info(f"Loaded {len(self._df_actuals)} actuals and {len(self._df_forecasts)} forecasts from cache file.")
                return
            except Exception as e:
                logger.warning(f"Failed to load cache file {self.cache_file}: {e}. Fetching from Elexon API...")

        self.fetch_and_cache_all()
        self._initialized = True

    def _load_from_cache_file(self) -> None:
        with open(self.cache_file, "r") as f:
            data = json.load(f)

        actuals = data.get("actuals", [])
        forecasts = data.get("forecasts", [])

        df_act = pd.DataFrame(actuals)
        if not df_act.empty:
            df_act["startTime"] = pd.to_datetime(df_act["startTime"], utc=True)
            df_act["generation"] = pd.to_numeric(df_act["generation"], errors="coerce")
            df_act = df_act.dropna(subset=["startTime", "generation"])
            df_act = df_act.sort_values("startTime").reset_index(drop=True)
            # Ensure unique on startTime
            df_act = df_act.drop_duplicates(subset=["startTime"], keep="last")

        df_fc = pd.DataFrame(forecasts)
        if not df_fc.empty:
            df_fc["startTime"] = pd.to_datetime(df_fc["startTime"], utc=True)
            df_fc["publishTime"] = pd.to_datetime(df_fc["publishTime"], utc=True)
            df_fc["generation"] = pd.to_numeric(df_fc["generation"], errors="coerce")
            df_fc = df_fc.dropna(subset=["startTime", "publishTime", "generation"])
            # Deduplicate by (startTime, publishTime)
            df_fc = df_fc.drop_duplicates(subset=["startTime", "publishTime"], keep="last")
            df_fc = df_fc.sort_values(["startTime", "publishTime"]).reset_index(drop=True)

        self._df_actuals = df_act
        self._df_forecasts = df_fc

    def fetch_and_cache_all(self) -> None:
        """Fetch all January 2026 data from Elexon API and persist to disk cache."""
        logger.info("Fetching January 2026 FUELHH actuals from Elexon...")
        actuals = self._fetch_fuelhh(
            start="2026-01-01T00:00:00Z",
            end="2026-02-01T00:30:00Z"
        )
        logger.info(f"Fetched {len(actuals)} wind actuals.")

        logger.info("Fetching WINDFOR forecasts from Elexon (including late Dec 2025)...")
        forecasts = self._fetch_windfor_chunked(
            start="2025-12-28T00:00:00Z",
            end="2026-02-01T00:00:00Z",
            chunk_days=7
        )
        logger.info(f"Fetched {len(forecasts)} forecast entries.")

        # Save to disk cache
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_data = {
            "fetched_at": datetime.now(timezone.utc).isoformat() if hasattr(datetime, 'timezone') else datetime.utcnow().isoformat() + "Z",
            "actuals": actuals,
            "forecasts": forecasts
        }
        with open(self.cache_file, "w") as f:
            json.dump(cache_data, f)
        logger.info(f"Persisted data cache to {self.cache_file}")

        self._load_from_cache_file()

    def _fetch_fuelhh(self, start: str, end: str) -> List[Dict[str, Any]]:
        """Fetch half-hourly fuel generation actuals filtered for WIND."""
        url = settings.FUELHH_ENDPOINT
        params = {"publishDateTimeFrom": start, "publishDateTimeTo": end}
        with httpx.Client(timeout=60.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            wind_data = [d for d in data if d.get("fuelType") == "WIND"]
            return wind_data

    def _fetch_windfor_chunked(self, start: str, end: str, chunk_days: int = 7) -> List[Dict[str, Any]]:
        """Fetch wind forecasts in rolling chunks to prevent gateway timeouts."""
        url = settings.WINDFOR_ENDPOINT
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))

        all_records: List[Dict[str, Any]] = []
        curr = start_dt

        with httpx.Client(timeout=60.0) as client:
            while curr < end_dt:
                nxt = min(curr + timedelta(days=chunk_days), end_dt)
                params = {
                    "publishDateTimeFrom": curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "publishDateTimeTo": nxt.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                resp = client.get(url, params=params)
                resp.raise_for_status()
                records = resp.json()
                all_records.extend(records)
                curr = nxt

        # Deduplicate
        seen = set()
        dedup = []
        for r in all_records:
            key = (r.get("startTime"), r.get("publishTime"))
            if key not in seen:
                seen.add(key)
                dedup.append(r)
        return dedup

    def get_actuals(self) -> pd.DataFrame:
        if not self._initialized or self._df_actuals is None:
            self.initialize()
        return self._df_actuals.copy()

    def get_forecasts(self) -> pd.DataFrame:
        if not self._initialized or self._df_forecasts is None:
            self.initialize()
        return self._df_forecasts.copy()

# Singleton instance
elexon_client = ElexonClient()
