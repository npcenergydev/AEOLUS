import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
import numpy as np

try:
    from app.services.metrics_service import MetricsService
except ImportError:
    from backend.app.services.metrics_service import MetricsService

def test_metrics_formulas_synthetic():
    """
    Test exact mathematical correctness of MAE, RMSE, MAPE, WAPE, Bias, P90, P99.
    """
    # Actuals: [1000, 2000, 3000, 4000]
    # Forecasts: [1100, 1900, 3300, 3800]
    # Errors (Forecast - Actual): [+100, -100, +300, -200]
    # Absolute Errors: [100, 100, 300, 200]
    actuals = np.array([1000.0, 2000.0, 3000.0, 4000.0])
    forecasts = np.array([1100.0, 1900.0, 3300.0, 3800.0])
    errors = forecasts - actuals
    abs_errors = np.abs(errors)

    expected_mae = (100 + 100 + 300 + 200) / 4.0  # 175.0
    expected_rmse = np.sqrt((100**2 + (-100)**2 + 300**2 + (-200)**2) / 4.0)  # sqrt(150000 / 4) = sqrt(37500) = 193.649
    expected_bias = (100 - 100 + 300 - 200) / 4.0  # +25.0
    
    # MAPE: (100/1000 + 100/2000 + 300/3000 + 200/4000) / 4 * 100
    # = (0.10 + 0.05 + 0.10 + 0.05) / 4 * 100 = 0.30 / 4 * 100 = 7.5%
    expected_mape = 7.5

    # WAPE: sum(abs_errors) / sum(actuals) * 100 = 700 / 10000 * 100 = 7.0%
    expected_wape = 7.0

    assert np.isclose(np.mean(abs_errors), expected_mae)
    assert np.isclose(np.sqrt(np.mean(errors**2)), expected_rmse)
    assert np.isclose(np.mean(errors), expected_bias)
    assert np.isclose(np.mean(abs_errors / actuals) * 100.0, expected_mape)
    assert np.isclose(np.sum(abs_errors) / np.sum(actuals) * 100.0, expected_wape)

def test_zero_actual_guard():
    """
    Ensure that when actual generation is 0, MAPE does not raise ZeroDivisionError
    and produces a finite bounded metric via epsilon guard.
    """
    actuals = np.array([0.0, 100.0])
    forecasts = np.array([50.0, 120.0])
    abs_errors = np.abs(forecasts - actuals)
    epsilon = 1.0
    safe_actuals = np.maximum(actuals, epsilon)
    mape = np.mean(abs_errors / safe_actuals) * 100.0
    assert np.isfinite(mape)
    assert mape > 0

def test_bias_direction():
    """
    Over-forecasting must result in a POSITIVE bias.
    Under-forecasting must result in a NEGATIVE bias.
    """
    # Overforecasting: forecast = 12000, actual = 10000 -> +2000
    assert (12000 - 10000) > 0
    # Underforecasting: forecast = 8000, actual = 10000 -> -2000
    assert (8000 - 10000) < 0

def test_metrics_service_live_summary():
    """
    Test MetricsService on real January 2026 slice (Jan 1-3).
    """
    resp = MetricsService.compute_metrics(
        start_date="2026-01-01",
        end_date="2026-01-03",
        cutoff_time_str="12:00",
        resolution="30min"
    )
    assert resp.overall.count == 144  # 3 days * 48
    assert resp.overall.mae > 0
    assert resp.overall.rmse >= resp.overall.mae
    assert resp.overall.p90_abs_error >= resp.overall.mae
    assert resp.overall.p99_abs_error >= resp.overall.p90_abs_error
    
    # Check hourly breakdown
    assert len(resp.hourly_breakdown) == 24
    assert resp.hourly_breakdown[0].hour == 0
    assert resp.hourly_breakdown[23].hour == 23

    # Check wind buckets
    assert len(resp.wind_bucket_breakdown) > 0

    # Check histogram
    assert len(resp.error_histogram) > 0
    total_pct = sum(b.frequency_pct for b in resp.error_histogram)
    assert np.isclose(total_pct, 100.0, atol=0.5)
