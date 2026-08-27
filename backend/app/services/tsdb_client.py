"""
TimescaleDB client for reading extruder sensor data.

Used when EXTRUDER_DATA_SOURCE=tsdb. Connects to the separate TimescaleDB
(TSDB_HOST, TSDB_PORT, etc.) and reads from the "Tab_Actual" table.
Returns the same row shape as the MSSQL-based endpoints so the frontend
and pressure alert logic can stay unchanged.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import asyncpg
from loguru import logger

from app.core.config import get_settings


def _tsdb_configured() -> bool:
    s = get_settings()
    return bool(
        (s.tsdb_host or "").strip()
        and (s.tsdb_user or "").strip()
        and (s.tsdb_password or "").strip()
    )


def tsdb_configured() -> bool:
    """Public check: True if TSDB env vars are set (for status endpoints)."""
    return _tsdb_configured()


async def _get_tsdb_connection() -> asyncpg.Connection:
    """Create a single connection to TimescaleDB. Caller must close it."""
    s = get_settings()
    return await asyncpg.connect(
        host=(s.tsdb_host or "localhost").strip(),
        port=int(s.tsdb_port or 5433),
        database=(s.tsdb_database or "timeseries").strip(),
        user=(s.tsdb_user or "").strip(),
        password=(s.tsdb_password or "").strip(),
        timeout=3.0,  # connection timeout — fail fast when edge is down
        command_timeout=5,
    )


def _row_to_extruder_dict(rec: asyncpg.Record) -> Dict[str, Any]:
    """Map a TSDB row (TrendDate, Val_1, Val_6, ...) to API shape (TrendDate, ScrewSpeed_rpm, Pressure_bar, ...)."""
    td = rec.get("time_utc") or rec.get("TrendDate")
    if isinstance(td, datetime):
        trend_date = td.isoformat()
    elif td is None:
        trend_date = None
    else:
        trend_date = str(td)
    return {
        "TrendDate": trend_date,
        "ScrewSpeed_rpm": rec.get("screw_speed") if "screw_speed" in rec else rec.get("Val_1"),
        "Pressure_bar": rec.get("pressure_bar") if "pressure_bar" in rec else rec.get("Val_6"),
        "Motor_load": rec.get("motor_load") if "motor_load" in rec else rec.get("Val_5"),
        "Temp_Zone1_C": rec.get("temp_zone_1") if "temp_zone_1" in rec else rec.get("Val_7"),
        "Temp_Zone2_C": rec.get("temp_zone_2") if "temp_zone_2" in rec else rec.get("Val_8"),
        "Temp_Zone3_C": rec.get("temp_zone_3") if "temp_zone_3" in rec else rec.get("Val_9"),
        "Temp_Zone4_C": rec.get("temp_zone_4") if "temp_zone_4" in rec else rec.get("Val_10"),
    }


async def fetch_extruder_latest_from_tsdb(limit: int = 200) -> List[Dict[str, Any]]:
    """
    Fetch the latest N rows from Tab_Actual in TimescaleDB.
    Returns list of dicts with keys: TrendDate, ScrewSpeed_rpm, Pressure_bar, Temp_Zone1_C..4.
    Order: oldest first (reversed from DESC query) to match MSSQL response.
    """
    if not _tsdb_configured():
        return []

    # Quoted identifiers for case-sensitive table/columns (TimescaleDB / PostgreSQL)
    query = """
        SELECT
          "TrendDate" AS time_utc,
          "Val_1"   AS screw_speed,
          "Val_6"   AS pressure_bar,
          "Val_5"   AS motor_load,
          "Val_7"   AS temp_zone_1,
          "Val_8"   AS temp_zone_2,
          "Val_9"   AS temp_zone_3,
          "Val_10"  AS temp_zone_4
        FROM "Tab_Actual"
        ORDER BY "TrendDate" DESC
        LIMIT $1
    """
    conn = None
    try:
        conn = await _get_tsdb_connection()
        rows = await conn.fetch(query, limit)
        out = [_row_to_extruder_dict(r) for r in reversed(rows)]
        return out
    except Exception as e:
        logger.warning("TimescaleDB fetch extruder latest failed: {}", e)
        raise
    finally:
        if conn:
            await conn.close()



async def fetch_extruder_latest_all_columns_from_tsdb() -> List[Dict[str, Any]]:
    """
    Fetch the latest N rows from Tab_Actual in TimescaleDB.
    Returns list of dicts with keys: TrendDate, ScrewSpeed_rpm, Pressure_bar, Temp_Zone1_C..4.
    Order: oldest first (reversed from DESC query) to match MSSQL response.
    """
    if not _tsdb_configured():
        return []

    # Quoted identifiers for case-sensitive table/columns (TimescaleDB / PostgreSQL)
    query = """
        SELECT *
        FROM "Tab_Actual"
        ORDER BY "TrendDate" DESC
        LIMIT 1
    """
    conn = None
    try:
        conn = await _get_tsdb_connection()
        rows = await conn.fetch(query)
        # out = [_row_to_extruder_dict(r) for r in reversed(rows)]
        # print(rows[0])
        # print('\n','\n','\n')
        return rows[0] if rows else []
    except Exception as e:
        logger.warning("TimescaleDB fetch extruder latest failed: {}", e)
        raise
    finally:
        if conn:
            await conn.close()


async def fetch_extruder_history_from_tsdb(
    days: int = 30,
    limit: int = 5000,
    hours: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch time-range history from Tab_Actual in TimescaleDB.
    Returns the MOST RECENT `limit` rows within the last `days` days (or last `hours` if given) (oldest first),
    so charts show latest data instead of the oldest slice.
    When hours=24, use WHERE TrendDate >= NOW() - 24 hours to guarantee full 24h coverage for 1d chart.
    """
    if not _tsdb_configured():
        return []

    if hours is not None:
        query = """
            SELECT
              "TrendDate" AS time_utc,
              "Val_1"   AS screw_speed,
              "Val_6"   AS pressure_bar,
              "Val_5"   AS motor_load,
              "Val_7"   AS temp_zone_1,
              "Val_8"   AS temp_zone_2,
              "Val_9"   AS temp_zone_3,
              "Val_10"  AS temp_zone_4
            FROM "Tab_Actual"
            WHERE "TrendDate" >= NOW() - INTERVAL '1 hour' * $1
            ORDER BY "TrendDate" DESC
            LIMIT $2
        """
        param1, param2 = hours, limit
    else:
        query = """
            SELECT
              "TrendDate" AS time_utc,
              "Val_1"   AS screw_speed,
              "Val_6"   AS pressure_bar,
              "Val_5"   AS motor_load,
              "Val_7"   AS temp_zone_1,
              "Val_8"   AS temp_zone_2,
              "Val_9"   AS temp_zone_3,
              "Val_10"  AS temp_zone_4
            FROM "Tab_Actual"
            WHERE "TrendDate" >= NOW() - INTERVAL '1 day' * $1
            ORDER BY "TrendDate" DESC
            LIMIT $2
        """
        param1, param2 = days, limit

    conn = None
    try:
        conn = await _get_tsdb_connection()
        rows = await conn.fetch(query, param1, param2)
        return [_row_to_extruder_dict(r) for r in reversed(rows)]
    except Exception as e:
        logger.warning("TimescaleDB fetch extruder history failed: {}", e)
        raise
    finally:
        if conn:
            await conn.close()


async def fetch_extruder_history_by_date_range(
    from_date: datetime,
    to_date: datetime,
    limit: int = 500000,
) -> List[Dict[str, Any]]:
    """
    Fetch extruder history between two timestamps.
    Returns data ordered oldest -> newest for chart rendering.
    """

    if not _tsdb_configured():
        return []

    query = """
        SELECT
          date_trunc('hour', "TrendDate") AS time_utc,

          AVG("Val_1")  AS screw_speed,
          AVG("Val_6")  AS pressure_bar,
          AVG("Val_5")  AS motor_load,

          AVG("Val_7")  AS temp_zone_1,
          AVG("Val_8")  AS temp_zone_2,
          AVG("Val_9")  AS temp_zone_3,
          AVG("Val_10") AS temp_zone_4

        FROM "Tab_Actual"

        WHERE "TrendDate" BETWEEN $1 AND $2

        GROUP BY date_trunc('hour', "TrendDate")

        ORDER BY time_utc ASC

        LIMIT $3
    """

    conn = None

    try:
        conn = await _get_tsdb_connection()

        rows = await conn.fetch(
            query,
            from_date,
            to_date,
            limit,
        )

        # Return oldest -> newest for charts
        return [_row_to_extruder_dict(r) for r in reversed(rows)]

    except Exception as e:
        logger.warning("TimescaleDB fetch by date range failed: {}", e)
        raise

    finally:
        if conn:
            await conn.close()


async def fetch_extruder_history_daily_from_tsdb(days: int = 365) -> List[Dict[str, Any]]:
    """
    Fetch one row per calendar day (daily max per sensor) from Tab_Actual.
    Use this for "All" and long ranges so we get all dates without hitting row limit.
    Returns list of dicts: TrendDate (noon of that day), ScrewSpeed_rpm, Pressure_bar, Temp_Zone1_C..4 (max per day).
    """
    if not _tsdb_configured():
        return []

    query = """
        SELECT
          date_trunc('day', "TrendDate") + INTERVAL '12 hours' AS time_utc,
          MAX("Val_1") AS screw_speed,
          MAX("Val_6") AS pressure_bar,
          MAX("Val_5") AS motor_load,
          MAX("Val_7") AS temp_zone_1,
          MAX("Val_8") AS temp_zone_2,
          MAX("Val_9") AS temp_zone_3,
          MAX("Val_10") AS temp_zone_4
        FROM "Tab_Actual"
        WHERE "TrendDate" >= NOW() - INTERVAL '1 day' * $1
        GROUP BY date_trunc('day', "TrendDate")
        ORDER BY time_utc ASC
    """
    conn = None
    try:
        conn = await _get_tsdb_connection()
        rows = await conn.fetch(query, days)
        return [_row_to_extruder_dict(r) for r in rows]
    except Exception as e:
        logger.warning("TimescaleDB fetch extruder history daily failed: {}", e)
        raise
    finally:
        if conn:
            await conn.close()


def is_extruder_data_source_tsdb() -> bool:
    """True if live charts should read from TimescaleDB instead of MSSQL/sensor_data."""
    s = get_settings()
    return (s.extruder_data_source or "").strip().lower() == "tsdb" and _tsdb_configured()


async def check_tsdb_connection() -> tuple[bool, str]:
    """
    Verify TimescaleDB is reachable and Tab_Actual exists.
    Returns (success, message) for use in status endpoints and startup logs.
    """
    if not _tsdb_configured():
        return False, "TimescaleDB not configured (set TSDB_HOST, TSDB_USER, TSDB_PASSWORD)"

    conn = None
    try:
        conn = await _get_tsdb_connection()
        # Simple connectivity + table check
        row = await conn.fetchrow('SELECT 1 FROM "Tab_Actual" LIMIT 1')
        if row is not None:
            return True, "TimescaleDB connected (Tab_Actual reachable)"
        return True, "TimescaleDB connected"
    except Exception as e:
        return False, f"TimescaleDB connection failed: {e}"
    finally:
        if conn:
            await conn.close()

