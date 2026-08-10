from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.machine_sensor_raw import MachineSensorRawCreate
from app.models.machine_sensor_raw import MachineSensorRaw
from app.models.default_sensor import DefaultSensor
from app.models.live_process_window import LiveProcessWindow
from collections import Counter

_MAX_PAGE_SIZE = 10_000




async def get_raw_by_run(db: AsyncSession, run_id: int):
    result = await db.execute(
        select(MachineSensorRaw).where(MachineSensorRaw.production_run_id == run_id)
    )
    return result.scalars().all()


async def get_latest_raw(db: AsyncSession, machine_id: UUID, limit: int = 50):
    cap = min(max(limit, 1), _MAX_PAGE_SIZE)
    result = await db.execute(
        select(MachineSensorRaw)
        .where(MachineSensorRaw.machine_id == machine_id)
        .order_by(MachineSensorRaw.timestamp.desc())
        .limit(cap)
    )
    return result.scalars().all()


async def get_raw_by_machine_line_time_range(
    db: AsyncSession,
    *,
    machine_id: UUID,
    line_id: int,
    date_from: datetime,
    date_to: datetime,
    limit: int,
    offset: int,
    sort_desc: bool,
) -> tuple[list[MachineSensorRaw], bool]:
    """
    Return up to `limit` rows ordered by timestamp,
    plus whether more rows exist.
    """

    cap = min(
        max(limit, 1),
        _MAX_PAGE_SIZE
    )

    order = (
        MachineSensorRaw.timestamp.desc()
        if sort_desc
        else MachineSensorRaw.timestamp.asc()
    )

    stmt = (
        select(MachineSensorRaw)
        .where(
            MachineSensorRaw.machine_id
            == machine_id,

            MachineSensorRaw.line_id
            == line_id,

            MachineSensorRaw.timestamp
            >= date_from,

            MachineSensorRaw.timestamp
            <= date_to,
        )
        .order_by(order)
        .limit(cap + 1)
        .offset(offset)
    )

    result = await db.execute(stmt)

    rows = list(
        result.scalars().all()
    )

    has_more = len(rows) > cap

    rows = rows[:cap]

    ###################################
    # Round val_* fields
    ###################################

    for row in rows:

        for key, value in vars(row).items():

            if (
                key.startswith("val_")
                and value is not None
            ):

                setattr(
                    row,
                    key,
                    round(value, 1)
                )

    return rows, has_more

async def get_machine_time_range_summary(
    db: AsyncSession,
    *,
    machine_id: UUID,
    line_id: int,
    date_from: datetime,
    date_to: datetime,
):
    result = await db.execute(
        select(MachineSensorRaw)
        .where(
            MachineSensorRaw.machine_id == machine_id,
            MachineSensorRaw.line_id == line_id,
            MachineSensorRaw.timestamp >= date_from,
            MachineSensorRaw.timestamp <= date_to,
        )
        .order_by(
            MachineSensorRaw.timestamp.asc()
        )
    )

    rows = list(result.scalars().all())

    if not rows:
        return {
            "totalRecords": 0,
            "duration": "0m",
            "avgScrewSpeed": 0,
            "avgPressure": 0,
            "avgTempZone1": 0,
            "avgTempZone2": 0,
            "avgTempZone3": 0,
            "avgTempZone4": 0,
            "minPressure": 0,
            "maxPressure": 0,
            "machineStates": {
                "OFF": 0,
                "Heating": 0,
                "Ready": 0,
                "Cooling": 0,
                "LOW_PRODUCTION": 0,
                "PRODUCTION": 0,
            },
        }


    ################################################
    # production run ids
    ################################################

    production_run_ids = sorted(

        list({

            row.production_run_id

            for row in rows

            if row.production_run_id
            is not None
        })
    )


    ################################################
    # live process windows
    ################################################

    machine_states = {}

    if production_run_ids:

        live_result = await db.execute(

            select(LiveProcessWindow)

            .where(

                LiveProcessWindow.machine_id
                == machine_id,

                LiveProcessWindow.line_id
                == line_id,

                LiveProcessWindow.production_run_id.in_(
                    production_run_ids
                )
            )

            .order_by(

                LiveProcessWindow.production_run_id.asc(),

                LiveProcessWindow.window_start.asc()
            )
        )

        live_rows = list(
            live_result.scalars().all()
        )


    ################################################
    # group rows by production run
    ################################################

    grouped_runs = {}

    for row in live_rows:

        run_id = row.production_run_id

        if run_id not in grouped_runs:

            grouped_runs[
                run_id
            ] = []

        grouped_runs[
            run_id
        ].append(row)


        ################################################
    # build machine states
    ################################################

    for run_id, run_rows in grouped_runs.items():

        run_states = {}

        current_state = None

        current_from = None

        current_to = None

        for row in run_rows:

            state = row.confirmed_state

            if not state:
                continue

            ####################################
            # first state
            ####################################

            if current_state is None:

                current_state = state

                current_from = row.window_start

                current_to = row.window_end

                continue

            ####################################
            # same state
            ####################################

            if state == current_state:

                current_to = row.window_end

            ####################################
            # state changed
            ####################################

            else:

                if current_state not in run_states:

                    run_states[
                        current_state
                    ] = []

                run_states[
                    current_state
                ].append({

                    "from":
                        current_from,

                    "to":
                        current_to
                })

                current_state = state

                current_from = row.window_start

                current_to = row.window_end

        ####################################
        # append last state
        ####################################

        if current_state:

            if current_state not in run_states:

                run_states[
                    current_state
                ] = []

            run_states[
                current_state
            ].append({

                "from":
                    current_from,

                "to":
                    current_to
            })

        machine_states[
            run_id
        ] = run_states


    ################################################
    # sensor mapping
    ################################################

    sensor_result = await db.execute(
        select(DefaultSensor)
        .where(
            DefaultSensor.machine_id == machine_id
        )
    )

    sensors = sensor_result.scalars().all()

    sensor_map = {}

    for sensor in sensors:

        if (
            sensor.map_val
            and sensor.name
        ):

            sensor_map[
                sensor.map_val.lower()
            ] = sensor.name


    ################################################
    # rows → dict conversion
    ################################################

    rows_dict = {}

    for row in rows:

        row_data = vars(row)

        for key, value in row_data.items():

            if not key.startswith(
                "val_"
            ):
                continue

            if value is None:
                continue

            key = key.lower()

            if key not in rows_dict:
                rows_dict[key] = []

            rows_dict[key].append(
                value
            )

    ################################################
    # dynamic aggregates
    ################################################

    temp_dict = {}

    for key, sensor_name in sensor_map.items():

        key = key.lower()

        if key not in rows_dict:
            continue

        values = rows_dict[key]

        if not values:
            continue

        temp_dict[sensor_name] = {
            "avg": round(
                sum(values)
                /
                len(values),
                1
            ),
            "min": round(
                min(values),
                1
            ),
            "max": round(
                max(values),
                1
            )
        }

    ################################################
    # duration
    ################################################

    duration_seconds = (
        rows[-1].timestamp -
        rows[0].timestamp
    ).total_seconds()

    hours = int(
        duration_seconds // 3600
    )

    minutes = int(
        (duration_seconds % 3600)
        // 60
    )

    duration = (
        f"{hours}h {minutes}m"
    )

    ################################################
    # response
    ################################################

    return {

        "totalRecords": len(rows),

        "duration": duration,

        "avgScrewSpeed":
            temp_dict.get(
                "ScrewSpeed_rpm",
                {}
            ).get(
                "avg",
                0
            ),

        "avgPressure":
            temp_dict.get(
                "Pressure_bar",
                {}
            ).get(
                "avg",
                0
            ),

        "avgTempZone1":
            temp_dict.get(
                "Temp_Zone_1",
                {}
            ).get(
                "avg",
                0
            ),

        "avgTempZone2":
            temp_dict.get(
                "Temp_Zone_2",
                {}
            ).get(
                "avg",
                0
            ),

        "avgTempZone3":
            temp_dict.get(
                "Temp_Zone_3",
                {}
            ).get(
                "avg",
                0
            ),

        "avgTempZone4":
            temp_dict.get(
                "Temp_Zone_4",
                {}
            ).get(
                "avg",
                0
            ),

        "minPressure":
            temp_dict.get(
                "Pressure_bar",
                {}
            ).get(
                "min",
                0
            ),

        "maxPressure":
            temp_dict.get(
                "Pressure_bar",
                {}
            ).get(
                "max",
                0
            ),

        "machineStates": machine_states,
    }




async def create_raw(
    db: AsyncSession,
    payload: MachineSensorRawCreate
):
    raw = MachineSensorRaw(
        **payload.model_dump()
    )

    db.add(raw)

    await db.commit()

    await db.refresh(raw)

    return raw





async def get_data_quality_summary(
    db: AsyncSession,
    *,
    machine_id: UUID,
    line_id: int,
    date_from: datetime,
    date_to: datetime,
):

    ########################################
    # Load rows
    ########################################

    result = await db.execute(
        select(MachineSensorRaw)
        .where(
            MachineSensorRaw.machine_id == machine_id,
            MachineSensorRaw.line_id == line_id,
            MachineSensorRaw.timestamp >= date_from,
            MachineSensorRaw.timestamp <= date_to,
        )
        .order_by(
            MachineSensorRaw.timestamp.asc()
        )
    )

    rows = list(
        result.scalars().all()
    )

    total_rows = len(rows)

    if not rows:

        return {
            "totalRecords": 0,
            "missingValues": {},
            "constantSensors": [],
            "unrealisticValues": {},
            "duplicatedTimestamps": 0,
            "sensorGaps": {},
            "unmappedColumns": [],
            "suspiciouslyFlatSignals": [],
        }

    ########################################
    # sensor mapping
    ########################################

    sensor_result = await db.execute(
        select(DefaultSensor)
        .where(
            DefaultSensor.machine_id
            == machine_id
        )
    )

    sensors = sensor_result.scalars().all()

    sensor_map = {}

    for sensor in sensors:

        if sensor.map_val:

            sensor_map[
                sensor.map_val.lower()
            ] = sensor.name

    ########################################
    # build rows_dict
    ########################################

    rows_dict = {}

    for row in rows:

        row_data = vars(row)

        for key, value in row_data.items():

            if not key.startswith(
                "val_"
            ):
                continue

            key = key.lower()

            if key not in rows_dict:
                rows_dict[key] = []

            rows_dict[key].append(
                value
            )

    ########################################
    # missing values
    ########################################

    missing_values = {}

    for key, values in rows_dict.items():

        missing_count = sum(
            1
            for v in values
            if v is None
        )

        if missing_count > 0:

            missing_values[
                sensor_map.get(
                    key,
                    key
                )
            ] = {
                "count":
                    missing_count,

                "percentage":
                    round(
                        (
                            missing_count
                            / total_rows
                        ) * 100,
                        2
                    )
            }

    ########################################
    # constant sensors
    ########################################

    constant_sensors = []

    for key, values in rows_dict.items():

        clean_values = [
            v for v in values
            if v is not None
        ]

        if (
            len(clean_values) > 0
            and len(
                set(clean_values)
            ) == 1
        ):

            constant_sensors.append(
                sensor_map.get(
                    key,
                    key
                )
            )

    ########################################
    # unrealistic values
    ########################################

    unrealistic_values = {}

    for key, values in rows_dict.items():

        bad_count = 0

        for value in values:

            if value is None:
                continue

            # generic industrial checks
            if (
                value < -9999
                or value > 999999
            ):
                bad_count += 1

        if bad_count > 0:

            unrealistic_values[
                sensor_map.get(
                    key,
                    key
                )
            ] = bad_count

    ########################################
    # duplicated timestamps
    ########################################

    timestamps = [
        row.timestamp
        for row in rows
    ]

    duplicated_timestamps = sum(
        count - 1
        for count in Counter(
            timestamps
        ).values()
        if count > 1
    )

    ########################################
    # sensor gaps
    ########################################

    sensor_gaps = {}

    for key, values in rows_dict.items():

        gaps = 0

        for value in values:

            if value is None:
                gaps += 1

        if gaps > 0:

            sensor_gaps[
                sensor_map.get(
                    key,
                    key
                )
            ] = gaps

    ########################################
    # unmapped columns
    ########################################

    unmapped_columns = []

    for key in rows_dict.keys():

        if key not in sensor_map:

            unmapped_columns.append(
                key
            )

    ########################################
    # suspiciously flat signals
    ########################################

    suspiciously_flat_signals = []

    for key, values in rows_dict.items():

        clean_values = [
            v for v in values
            if v is not None
        ]

        if len(clean_values) < 10:
            continue

        value_range = (
            max(clean_values)
            - min(clean_values)
        )

        if value_range < 0.01:

            suspiciously_flat_signals.append(
                sensor_map.get(
                    key,
                    key
                )
            )

    ########################################
    # response
    ########################################

    return {

        "totalRecords":
            total_rows,

        "missingValues":
            missing_values,

        "constantSensors":
            constant_sensors,

        "unrealisticValues":
            unrealistic_values,

        "duplicatedTimestamps":
            duplicated_timestamps,

        "sensorGaps":
            sensor_gaps,

        "unmappedColumns":
            unmapped_columns,

        "suspiciouslyFlatSignals":
            suspiciously_flat_signals,
    }