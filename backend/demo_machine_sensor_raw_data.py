# demo_machine_sensor_raw_data.py

import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import uuid

DATABASE_URL = "postgresql+asyncpg://pm_user:pm_pass@localhost:5434/pm_db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

MACHINE_ID = "6f37c433-44e9-4a66-b019-cc342a95cc54"
LINE_ID = 29


def random_sensor_value():
    return round(random.uniform(0, 100), 2)


async def populate_demo_data():

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=7)

    current_time = start_time

    async with engine.begin() as conn:

        counter = 0

        while current_time <= end_time:

            query = text("""
                INSERT INTO machine_sensor_raw (
                    id,
                    machine_id,
                    line_id,
                    timestamp,
                    production_run_id,

                    val_1, val_2, val_3, val_4,
                    val_5, val_6, val_7, val_8,
                    val_9, val_10, val_11, val_12,
                    val_14, val_15,
                    val_19, val_20, val_21, val_22, val_23,
                    val_27, val_28, val_29, val_30,
                    val_31, val_32, val_33, val_34,
                    val_35, val_36, val_37, val_38,
                    val_39, val_40, val_41, val_42,
                    val_43, val_44, val_45, val_46,
                    val_47, val_48,
                    tab_actual_timestamp
                )
                VALUES (
                    :id,
                    :machine_id,
                    :line_id,
                    :timestamp,
                    :production_run_id,

                    :val_1, :val_2, :val_3, :val_4,
                    :val_5, :val_6, :val_7, :val_8,
                    :val_9, :val_10, :val_11, :val_12,
                    :val_14, :val_15,
                    :val_19, :val_20, :val_21, :val_22, :val_23,
                    :val_27, :val_28, :val_29, :val_30,
                    :val_31, :val_32, :val_33, :val_34,
                    :val_35, :val_36, :val_37, :val_38,
                    :val_39, :val_40, :val_41, :val_42,
                    :val_43, :val_44, :val_45, :val_46,
                    :val_47, :val_48,
                    :tab_actual_timestamp
                )
            """)

            values = {
                "id": str(uuid.uuid4()),
                "machine_id": MACHINE_ID,
                "line_id": LINE_ID,
                "timestamp": current_time,
                "production_run_id": None,

                "val_1": random_sensor_value(),
                "val_2": random_sensor_value(),
                "val_3": random_sensor_value(),
                "val_4": random_sensor_value(),
                "val_5": random_sensor_value(),
                "val_6": random_sensor_value(),
                "val_7": random_sensor_value(),
                "val_8": random_sensor_value(),
                "val_9": random_sensor_value(),
                "val_10": random_sensor_value(),
                "val_11": random_sensor_value(),
                "val_12": random_sensor_value(),
                "val_14": random_sensor_value(),
                "val_15": random_sensor_value(),
                "val_19": random_sensor_value(),
                "val_20": random_sensor_value(),
                "val_21": random_sensor_value(),
                "val_22": random_sensor_value(),
                "val_23": random_sensor_value(),
                "val_27": random_sensor_value(),
                "val_28": random_sensor_value(),
                "val_29": random_sensor_value(),
                "val_30": random_sensor_value(),
                "val_31": random_sensor_value(),
                "val_32": random_sensor_value(),
                "val_33": random_sensor_value(),
                "val_34": random_sensor_value(),
                "val_35": random_sensor_value(),
                "val_36": random_sensor_value(),
                "val_37": random_sensor_value(),
                "val_38": random_sensor_value(),
                "val_39": random_sensor_value(),
                "val_40": random_sensor_value(),
                "val_41": random_sensor_value(),
                "val_42": random_sensor_value(),
                "val_43": random_sensor_value(),
                "val_44": random_sensor_value(),
                "val_45": random_sensor_value(),
                "val_46": random_sensor_value(),
                "val_47": random_sensor_value(),
                "val_48": random_sensor_value(),

                "tab_actual_timestamp": datetime.now(),
            }

            await conn.execute(query, values)

            counter += 1

            if counter % 100 == 0:
                print(f"Inserted {counter} rows...")

            current_time += timedelta(minutes=5)

    print("Demo data inserted successfully.")


if __name__ == "__main__":
    asyncio.run(populate_demo_data())