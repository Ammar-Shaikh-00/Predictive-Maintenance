from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.schemas.state_sensor_priority import StateSensorPriorityOut
from app.db.session import get_session
from app.schemas.default_sensor import (
    DefaultSensorCreate,
    DefaultSensorRead,
)
from app.services import default_sensor_service
from app.models.state_senor_priority import StateSensorPriority
from fastapi import Response

router = APIRouter(prefix="/default-sensors", tags=["Default Sensors"])


@router.post(
    "",
    response_model=DefaultSensorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_sensor(
    sensor_in: DefaultSensorCreate,
    session: AsyncSession = Depends(get_session),
):
    return await default_sensor_service.create_default_sensor(
        session, sensor_in
    )


@router.get(
    "",
    response_model=List[DefaultSensorRead],
)
async def list_sensors(
    session: AsyncSession = Depends(get_session),
):
    return await default_sensor_service.get_default_sensors(session)


@router.get(
    "/{sensor_id}",
    response_model=DefaultSensorRead,
)
async def get_sensor(
    sensor_id: int,
    session: AsyncSession = Depends(get_session),
):
    sensor = await default_sensor_service.get_default_sensor_by_id(
        session, sensor_id
    )

    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor not found",
        )

    return sensor



@router.put(
    "/{sensor_id}",
    response_model=DefaultSensorRead,
)
async def update_sensor(
    sensor_id: int,
    sensor_in: DefaultSensorCreate,
    session: AsyncSession = Depends(get_session),
):
    sensor = await default_sensor_service.update_default_sensor(
        session=session,
        sensor_id=sensor_id,
        sensor_in=sensor_in,
    )

    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor not found",
        )

    return sensor


@router.delete(
    "/{sensor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_sensor(
    sensor_id: int,
    session: AsyncSession = Depends(get_session),
):
    deleted = await default_sensor_service.delete_default_sensor(
        session=session,
        sensor_id=sensor_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)



# -------------------- State Sensor Priorities --------------------
@router.get("/state-sensor-priorities", response_model=list[StateSensorPriorityOut])
async def get_state_sensor_priorities(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(StateSensorPriority))
    return result.scalars().all()