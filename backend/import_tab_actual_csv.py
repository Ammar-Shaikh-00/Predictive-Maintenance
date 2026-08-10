# import_tab_actual_csv.py

import asyncio
import uuid
import pandas as pd

from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# =========================================================
# CONFIG
# =========================================================

DATABASE_URL = "postgresql+asyncpg://pm_user:pm_pass@localhost:5434/pm_db"

CSV_FILE = "Tab_Actual.csv"

MACHINE_ID = "6f37c433-44e9-4a66-b019-cc342a95cc54"
LINE_ID = 29

BATCH_SIZE = 2000

# =========================================================
# DB ENGINE
# =========================================================

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

# =========================================================
# INSERT QUERY
# =========================================================

INSERT_QUERY = text("""
INSERT INTO machine_sensor_raw (
    id,
    machine_id,
    line_id,
    timestamp,
    production_run_id,

    val_1,
    val_2,
    val_3,
    val_4,
    val_5,
    val_6,
    val_7,
    val_8,
    val_9,
    val_10,
    val_11,
    val_12,
    val_14,
    val_15,
    val_19,
    val_20,
    val_21,
    val_22,
    val_23,
    val_27,
    val_28,
    val_29,
    val_30,
    val_31,
    val_32,
    val_33,
    val_34,
    val_35,
    val_36,
    val_37,
    val_38,
    val_39,
    val_40,
    val_41,
    val_42,
    val_43,
    val_44,
    val_45,
    val_46,
    val_47,
    val_48,

    tab_actual_timestamp
)
VALUES (
    :id,
    :machine_id,
    :line_id,
    :timestamp,
    :production_run_id,

    :val_1,
    :val_2,
    :val_3,
    :val_4,
    :val_5,
    :val_6,
    :val_7,
    :val_8,
    :val_9,
    :val_10,
    :val_11,
    :val_12,
    :val_14,
    :val_15,
    :val_19,
    :val_20,
    :val_21,
    :val_22,
    :val_23,
    :val_27,
    :val_28,
    :val_29,
    :val_30,
    :val_31,
    :val_32,
    :val_33,
    :val_34,
    :val_35,
    :val_36,
    :val_37,
    :val_38,
    :val_39,
    :val_40,
    :val_41,
    :val_42,
    :val_43,
    :val_44,
    :val_45,
    :val_46,
    :val_47,
    :val_48,

    :tab_actual_timestamp
)
""")

# =========================================================
# MAIN IMPORT FUNCTION
# =========================================================


async def import_csv():

    print("Reading CSV...")

    df = pd.read_csv(CSV_FILE)

    print(f"Total rows found: {len(df)}")

    # Convert timestamp column
    df["TrendDate"] = pd.to_datetime(df["TrendDate"])

    inserted = 0

    async with engine.begin() as conn:

        batch = []

        for _, row in df.iterrows():

            values = {
                "id": str(uuid.uuid4()),
                "machine_id": MACHINE_ID,
                "line_id": LINE_ID,

                "timestamp": row["TrendDate"],

                "production_run_id": None,

                "val_1": row.get("Val_1"),
                "val_2": row.get("Val_2"),
                "val_3": row.get("Val_3"),
                "val_4": row.get("Val_4"),
                "val_5": row.get("Val_5"),
                "val_6": row.get("Val_6"),
                "val_7": row.get("Val_7"),
                "val_8": row.get("Val_8"),
                "val_9": row.get("Val_9"),
                "val_10": row.get("Val_10"),
                "val_11": row.get("Val_11"),
                "val_12": row.get("Val_12"),
                "val_14": row.get("Val_14"),
                "val_15": row.get("Val_15"),
                "val_19": row.get("Val_19"),
                "val_20": row.get("Val_20"),
                "val_21": row.get("Val_21"),
                "val_22": row.get("Val_22"),
                "val_23": row.get("Val_23"),
                "val_27": row.get("Val_27"),
                "val_28": row.get("Val_28"),
                "val_29": row.get("Val_29"),
                "val_30": row.get("Val_30"),
                "val_31": row.get("Val_31"),
                "val_32": row.get("Val_32"),
                "val_33": row.get("Val_33"),
                "val_34": row.get("Val_34"),
                "val_35": row.get("Val_35"),
                "val_36": row.get("Val_36"),
                "val_37": row.get("Val_37"),
                "val_38": row.get("Val_38"),
                "val_39": row.get("Val_39"),
                "val_40": row.get("Val_40"),
                "val_41": row.get("Val_41"),
                "val_42": row.get("Val_42"),
                "val_43": row.get("Val_43"),
                "val_44": row.get("Val_44"),
                "val_45": row.get("Val_45"),
                "val_46": row.get("Val_46"),
                "val_47": row.get("Val_47"),
                "val_48": row.get("Val_48"),

                "tab_actual_timestamp": datetime.now(),
            }

            batch.append(values)

            # Bulk insert
            if len(batch) >= BATCH_SIZE:

                await conn.execute(INSERT_QUERY, batch)

                inserted += len(batch)

                print(f"Inserted: {inserted}")

                batch = []

        # Remaining rows
        if batch:
            await conn.execute(INSERT_QUERY, batch)

            inserted += len(batch)

            print(f"Inserted: {inserted}")

    print("CSV import completed successfully.")


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    asyncio.run(import_csv())