"""Module 20 — Executive View API."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_session
from app.models.user import User
from app.services import executive_view_service as svc

router = APIRouter(prefix="/executive-view", tags=["executive-view"])


@router.get("/overview")
async def executive_overview(
    company_id: str = Query("default"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """High-level management KPIs — honest provenance, no invented ROI/Accuracy."""
    return await svc.get_executive_overview(session, company_id=company_id)
