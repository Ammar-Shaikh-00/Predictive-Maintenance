from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.default_sensor import DefaultSensor
from app.schemas.default_sensor import DefaultSensorCreate


async def create_default_sensor(
    session: AsyncSession, sensor_in: DefaultSensorCreate
) -> DefaultSensor:
    sensor = DefaultSensor(name=sensor_in.name,                     
                            map_val = sensor_in.map_val,
                            machine_id = sensor_in.machine_id,
                            unit = sensor_in.unit,
                            description = sensor_in.description,
                           )

    session.add(sensor)
    await session.commit()
    await session.refresh(sensor)

    return sensor


async def get_default_sensors(session: AsyncSession):
    result = await session.execute(select(DefaultSensor))
    return result.scalars().all()


async def get_default_sensor_by_id(
    session: AsyncSession, sensor_id: int
):
    result = await session.execute(
        select(DefaultSensor).where(DefaultSensor.id == sensor_id)
    )
    return result.scalar_one_or_none()



async def update_default_sensor(
    session,
    sensor_id: int,
    sensor_in,
):
    result = await session.execute(
        select(DefaultSensor)
        .where(DefaultSensor.id == sensor_id)
    )

    sensor = result.scalar_one_or_none()

    if not sensor:
        return None

    sensor.name = sensor_in.name
    sensor.map_val = sensor_in.map_val
    sensor.machine_id = sensor_in.machine_id
    sensor.unit = sensor_in.unit
    sensor.description = sensor_in.description

    await session.commit()
    await session.refresh(sensor)

    return sensor


async def delete_default_sensor(
    session,
    sensor_id: int,
):
    result = await session.execute(
        select(DefaultSensor)
        .where(DefaultSensor.id == sensor_id)
    )

    sensor = result.scalar_one_or_none()

    if not sensor:
        return False

    await session.delete(sensor)

    await session.commit()

    return True


