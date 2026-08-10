from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_session
from app.models.machine_status import MachineStatus
from app.schemas.machine_status import (
    MachineStatusOut,
    MachineStatusUpdate
)

router = APIRouter(prefix="/machine-status", tags=["Machine Status"])


@router.get("/", response_model=MachineStatusOut)
async def get_machine_status(db: AsyncSession = Depends(get_session)):

    result = await db.execute(select(MachineStatus))
    status = result.scalar_one_or_none()

    if not status:
        status = MachineStatus()
        db.add(status)
        await db.commit()
        await db.refresh(status)
        return status

    return status



@router.put("/", response_model=MachineStatusOut)
async def update_machine_status(
    payload: MachineStatusUpdate,
    db: AsyncSession = Depends(get_session)
):
    try:
        result = await db.execute(select(MachineStatus))
        status = result.scalar_one_or_none()

        if not status:
            status = MachineStatus(status=payload.status)
            db.add(status)
            await db.commit()
            await db.refresh(status)
            return status

        # ✅ Update
        status.status = payload.status

        await db.commit()
        await db.refresh(status)

        return status

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))