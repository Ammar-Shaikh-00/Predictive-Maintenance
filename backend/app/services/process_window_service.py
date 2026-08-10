from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.live_process_window import LiveProcessWindow


async def get_windows_by_run(db: AsyncSession, run_id: int):
    result = await db.execute(
        select(LiveProcessWindow).where(
            LiveProcessWindow.production_run_id == run_id
        )
    )
    return result.scalars().all()
