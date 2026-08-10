import asyncio
import logging
from collections import deque
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.models.machine_sensor_raw import MachineSensorRaw
from app.services import tsdb_client
from loguru import logger
# logger = logging.getLogger(__name__)

# keeps last 10 payloads in memory
sensor_buffer = deque(maxlen=10)

MACHINE_ID = UUID(
    "6f37c433-44e9-4a66-b019-cc342a95cc54"
)

LINE_ID = 29


async def save_to_machine_sensor_raw(record):

    async with AsyncSessionLocal() as session:

        try:

            payload = {
                "machine_id": MACHINE_ID,
                "line_id": LINE_ID,
                "production_run_id": None,
                "timestamp": record['TrendDate'],
            }
            
            
            # dynamically map Val_1 -> val_1 ... Val_48 -> val_48
            for key in record.keys():

                if key.startswith("Val_"):

                    db_field = key.lower()

                    payload[db_field] = record[key]

            row = MachineSensorRaw(**payload)

            session.add(row)

            await session.commit()

            logger.info(
                f"Inserted TrendDate={record['TrendDate']}"
            )

        except Exception as e:

            await session.rollback()
            err_str = f"Insert failed: {e}"
            logger.error(err_str
            )


async def extruder_poller():

    logger.info(
        "Extruder poller started"
    )

    while True:

        try:

            data = await tsdb_client.fetch_extruder_latest_all_columns_from_tsdb()

            if not data:

                logger.warning(
                    "No sensor data returned"
                )

                await asyncio.sleep(10)
                continue


            latest = data[0] if isinstance(data, list) else data


            current_ts = latest["TrendDate"]

            if len(sensor_buffer)<10:
                sensor_buffer.append(latest)
                logger.info("extruder_poller buffer is filling>>>>")
                continue


            all_same = all(item["TrendDate"] == current_ts
                    for item in sensor_buffer
                )

            if all_same:

                logger.info(
                    "All deque TrendDates are same. Skipping: %s",
                    current_ts
                )

                await asyncio.sleep(10)
                continue


            sensor_buffer.append(latest)

            logger.info(
                "Buffer size=%s TrendDate=%s",
                len(sensor_buffer),
                current_ts
            )

            
            

            await save_to_machine_sensor_raw(
                latest
            )

        except Exception as e:

            logger.exception(
                "Poller failed: %s",
                str(e)
            )

        await asyncio.sleep(10)