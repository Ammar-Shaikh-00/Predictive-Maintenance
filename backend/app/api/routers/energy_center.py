"""Module 19 — Energy Center API."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_session
from app.models.user import User
from app.schemas.energy_center import EnergySettingsUpsert
from app.services import energy_center_service as svc

router = APIRouter(prefix="/energy-center", tags=["energy-center"])


@router.get("/overview")
async def energy_overview(
    company_id: str = Query("default"),
    limit: int = Query(500, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Consumption, cost, by machine/material, CO₂, savings potential."""
    return await svc.get_overview(session, company_id=company_id, limit=limit)


@router.get("/settings")
async def get_energy_settings(
    company_id: str = Query("default"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await svc.get_settings(session, company_id=company_id)


@router.put("/settings")
async def upsert_energy_settings(
    payload: EnergySettingsUpsert,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await svc.upsert_settings(session, payload)
