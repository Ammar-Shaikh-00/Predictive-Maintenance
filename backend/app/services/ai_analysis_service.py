from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.ai_run_analysis import AiRunAnalysis


async def get_ai_by_run(db: AsyncSession, run_id: int):
    result = await db.execute(
        select(AiRunAnalysis).where(
            AiRunAnalysis.production_run_id == run_id
        )
    )
    return result.scalar_one_or_none()