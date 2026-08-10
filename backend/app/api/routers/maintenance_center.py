"""Module 18 — Maintenance Center API."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_session
from app.models.user import User
from app.schemas.maintenance_center import (
    MaintenancePlanCreate,
    MaintenancePlanUpdate,
    WearPartCreate,
    WearPartUpdate,
)
from app.services import maintenance_center_service as svc

router = APIRouter(prefix="/maintenance-center", tags=["maintenance-center"])


@router.get("/overview")
async def maintenance_overview(
    company_id: str = Query("default"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Aggregate: RUL (if any), calendar, history, planned, wear parts."""
    return await svc.get_overview(session, company_id=company_id)


@router.get("/plans")
async def list_plans(
    company_id: str = Query("default"),
    limit: int = Query(200, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = await svc.list_plans(session, company_id=company_id, limit=limit)
    return {"company_id": company_id, "count": len(rows), "rows": rows}


@router.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: MaintenancePlanCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await svc.create_plan(session, payload)


@router.patch("/plans/{plan_id}")
async def update_plan(
    plan_id: UUID,
    payload: MaintenancePlanUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await svc.update_plan(session, plan_id, payload)
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return row


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ok = await svc.delete_plan(session, plan_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Plan not found")
    return None


@router.get("/wear-parts")
async def list_wear_parts(
    company_id: str = Query("default"),
    limit: int = Query(200, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = await svc.list_wear_parts(session, company_id=company_id, limit=limit)
    return {"company_id": company_id, "count": len(rows), "rows": rows}


@router.post("/wear-parts", status_code=status.HTTP_201_CREATED)
async def create_wear_part(
    payload: WearPartCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await svc.create_wear_part(session, payload)


@router.patch("/wear-parts/{part_id}")
async def update_wear_part(
    part_id: UUID,
    payload: WearPartUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    row = await svc.update_wear_part(session, part_id, payload)
    if not row:
        raise HTTPException(status_code=404, detail="Wear part not found")
    return row


@router.delete("/wear-parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wear_part(
    part_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ok = await svc.delete_wear_part(session, part_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Wear part not found")
    return None
