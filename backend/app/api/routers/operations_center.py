from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_session, get_current_user
from app.models.user import User
from app.services.operations_center_service import build_operations_center_overview

router = APIRouter(prefix="/operations-center", tags=["operations-center"])


@router.get("/overview")
async def operations_center_overview(
    company_id: str = "default",
    bootstrap_if_empty: bool = True,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Single aggregated payload for the Operations Center home page.
    Prefer this over multiple frontend polls on the HP Mini PC.
    """
    return await build_operations_center_overview(
        session,
        company_id=company_id,
        bootstrap_if_empty=bootstrap_if_empty,
        use_cache=True,
    )
