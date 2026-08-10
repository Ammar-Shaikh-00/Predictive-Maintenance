from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_session
from app.models.alert_service import AlertService
from app.schemas.alert_service import AlertServiceResponse

router = APIRouter(prefix="/alert-service", tags=["Alert Service"])


@router.get("", response_model=AlertServiceResponse)
async def get_status(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AlertService))
    obj = result.scalars().first()

    # Ensure single row exists
    if not obj:
        obj = AlertService(status=True)
        session.add(obj)
        await session.commit()
        await session.refresh(obj)

    return obj


@router.patch("/toggle", response_model=AlertServiceResponse)
async def toggle_status(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AlertService))
    obj = result.scalars().first()

    if not obj:
        obj = AlertService(status=True)
        session.add(obj)

    obj.status = not obj.status
    await session.commit()
    await session.refresh(obj)

    return obj