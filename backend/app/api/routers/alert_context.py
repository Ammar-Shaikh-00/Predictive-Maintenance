from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_session
from app.models.alert_context import AlertContext
from app.schemas.alert_context import AlertContextResponse, AlertContextUpdate,AlertContextBase

router = APIRouter(prefix="/alert-context", tags=["Alert Context"])


@router.get("", response_model=list[AlertContextResponse])
async def get_all(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AlertContext))
    return result.scalars().all()


@router.put("/{id}", response_model=AlertContextResponse)
async def update_context(
    id: int,
    payload: AlertContextUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(AlertContext).where(AlertContext.id == id)
    )
    obj = result.scalars().first()

    if not obj:
        return {"error": "Not found"}

    for key, value in payload.dict().items():
        setattr(obj, key, value)

    await session.commit()
    await session.refresh(obj)

    return obj




@router.post("", response_model=AlertContextResponse)
async def create_context(
    payload: AlertContextBase,
    session: AsyncSession = Depends(get_session),
):
    # prevent duplicate for same sensor (optional but recommended)
    result = await session.execute(
        select(AlertContext).where(
            AlertContext.default_sensor_id == payload.default_sensor_id
        )
    )
    existing = result.scalars().first()

    if existing:
        raise HTTPException(status_code=400, detail="Context already exists for this sensor")

    obj = AlertContext(**payload.dict())

    session.add(obj)
    await session.commit()
    await session.refresh(obj)

    return obj
