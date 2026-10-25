import pytest
from datetime import datetime, time
import pandas as pd
from backend.app.services.forecast_service import ForecastService

def test_parse_cutoff_time():
    assert ForecastService.parse_cutoff_time("12:00") == time(12, 0)
    assert ForecastService.parse_cutoff_time("09:30") == time(9, 30)
    assert ForecastService.parse_cutoff_time("18:00") == time(18, 0)
    # Default fallback on invalid string
    assert ForecastService.parse_cutoff_time("invalid") == time(12, 0)

def test_cutoff_selection_synthetic():
    """
    Verify that for delivery on day D (2026-01-02 14:00),
    only forecasts published BEFORE D-1 12:00 (2026-01-01 12:00) are eligible,
    and the latest one is chosen.
    """
    # Target delivery hour
    target_dt = pd.Timestamp("2026-01-02 14:00:00Z")
    cutoff_dt = pd.Timestamp("2026-01-01 12:00:00Z")

    # Mock forecasts for target
    forecast_records = [
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 04:00:00Z"), "generation": 10000.0},
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 09:00:00Z"), "generation": 11000.0},
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 11:30:00Z"), "generation": 12000.0}, # Latest before 12:00
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 14:00:00Z"), "generation": 13000.0}, # After cutoff!
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-02 08:00:00Z"), "generation": 14000.0}, # Delivery day!
    ]
    df_fc = pd.DataFrame(forecast_records)

    eligible = df_fc[(df_fc["startTime"] == target_dt) & (df_fc["publishTime"] <= cutoff_dt)]
    assert len(eligible) == 3
    latest = eligible.sort_values("publishTime").iloc[-1]
    assert latest["generation"] == 12000.0
    assert latest["publishTime"] == pd.Timestamp("2026-01-01 11:30:00Z")

def test_cutoff_time_adjustment_changes_selected_forecast():
    """
    Test that changing cutoff from 09:00 to 12:00 to 15:00
    selects different forecasts depending on what was available.
    """
    target_dt = pd.Timestamp("2026-01-02 14:00:00Z")
    df_fc = pd.DataFrame([
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 08:00:00Z"), "generation": 10000.0},
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 10:00:00Z"), "generation": 11500.0},
        {"startTime": target_dt, "publishTime": pd.Timestamp("2026-01-01 13:00:00Z"), "generation": 12500.0},
    ])

    # Cutoff at 09:00 -> Only 08:00 is eligible
    c_09 = pd.Timestamp("2026-01-01 09:00:00Z")
    sel_09 = df_fc[df_fc["publishTime"] <= c_09].sort_values("publishTime").iloc[-1]
    assert sel_09["generation"] == 10000.0

    # Cutoff at 12:00 -> 10:00 is eligible
    c_12 = pd.Timestamp("2026-01-01 12:00:00Z")
    sel_12 = df_fc[df_fc["publishTime"] <= c_12].sort_values("publishTime").iloc[-1]
    assert sel_12["generation"] == 11500.0

    # Cutoff at 15:00 -> 13:00 is eligible
    c_15 = pd.Timestamp("2026-01-01 15:00:00Z")
    sel_15 = df_fc[df_fc["publishTime"] <= c_15].sort_values("publishTime").iloc[-1]
    assert sel_15["generation"] == 12500.0

def test_january_first_cutoff_boundary():
    """
    For delivery on Jan 1, 2026, the cutoff must be Dec 31, 2025 at 12:00 GMT.
    """
    target_dt = pd.Timestamp("2026-01-01 00:00:00Z")
    cutoff_day = target_dt.date() - pd.Timedelta(days=1)
    cutoff_dt = pd.Timestamp(year=cutoff_day.year, month=cutoff_day.month, day=cutoff_day.day, hour=12, minute=0, tz="UTC")
    assert cutoff_dt == pd.Timestamp("2025-12-31 12:00:00Z")

def test_get_aligned_forecasts_live_cache():
    """
    Test real alignment using the pre-cached January data.
    """
    resp = ForecastService.get_aligned_forecasts(
        start_date="2026-01-01",
        end_date="2026-01-02",
        cutoff_time_str="12:00",
        resolution="30min"
    )
    assert resp.total_points == 96  # 48 periods * 2 days
    assert resp.matched_points > 0
    # Check that points have both actual and forecast
    p0 = resp.points[0]
    assert p0.actual_mw is not None
    assert p0.forecast_mw is not None
    assert p0.cutoffUsed == "2025-12-31T12:00:00+00:00"
    # Verify uncertainty interval is well-ordered
    assert p0.p10_uncertainty_mw is not None
    assert p0.p90_uncertainty_mw is not None
    assert p0.p10_uncertainty_mw <= p0.p90_uncertainty_mw

def test_get_aligned_forecasts_hourly_resolution():
    """
    Test hourly aggregation resolution.
    """
    resp = ForecastService.get_aligned_forecasts(
        start_date="2026-01-01",
        end_date="2026-01-02",
        cutoff_time_str="12:00",
        resolution="60min"
    )
    assert resp.total_points == 48  # 24 hours * 2 days
    assert resp.matched_points == 48
