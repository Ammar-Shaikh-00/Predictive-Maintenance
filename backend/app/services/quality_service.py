from sqlalchemy.ext.asyncio import AsyncSession
from app.models.quality_record import QualityRecord
from sqlalchemy import select, desc
from app.schemas.quality import QualityCreate


async def create_quality(db: AsyncSession, run_id: int, data):
    obj = QualityRecord(**data.dict(), production_run_id=run_id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

# 🔹 Get all quality records for a run
async def get_quality_by_run(db: AsyncSession, run_id):
    result = await db.execute(
        select(QualityRecord)
        .where(QualityRecord.production_run_id == run_id)
        .order_by(desc(QualityRecord.id))
    )
    return result.scalar_one_or_none()


async def upsert_quality(db: AsyncSession, run_id: int, payload: QualityCreate):
    # 🔹 Check if quality exists for this run
    result = await db.execute(
        select(QualityRecord).where(QualityRecord.production_run_id == run_id)
    )
    quality = result.scalar_one_or_none()

    if quality:
        # 🔹 UPDATE existing
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(quality, field, value)
    else:
        # 🔹 CREATE new
        quality = QualityRecord(
            production_run_id=run_id,
            **payload.model_dump(exclude_unset=True)
        )
        db.add(quality)

    await db.commit()
    await db.refresh(quality)

    return quality