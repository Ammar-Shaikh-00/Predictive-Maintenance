from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.machine_sensor_raw import (
    MachineSensorRawQueryPageResponse,
    MachineSensorRawResponse,
    MachineSensorRawCreate
)
from app.services import machine_sensor_raw_service

router = APIRouter(prefix="/machine-raw-data", tags=["Machine Raw Data"])


_MAX_RANGE_DAYS = 366


def _validate_time_range(date_from: datetime, date_to: datetime) -> None:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="datefrom must be less than or equal to dateTo.",
        )
    span_seconds = (date_to - date_from).total_seconds()
    if span_seconds > _MAX_RANGE_DAYS * 86400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time range must not exceed {_MAX_RANGE_DAYS} days.",
        )




@router.get("/time-range-summary")
async def get_time_range_summary(
    datefrom: datetime = Query(...),
    dateTo: datetime = Query(...),
    machine_id: UUID = Query(...),
    line_id: int = Query(...),
    db: AsyncSession = Depends(
        get_session
    ),
):
    return await machine_sensor_raw_service.get_machine_time_range_summary(
        db,
        machine_id=machine_id,
        line_id=line_id,
        date_from=datefrom,
        date_to=dateTo
    )


@router.get("/data-quality-summary")
async def get_data_quality_summary(

    datefrom: datetime = Query(...),

    dateTo: datetime = Query(...),

    machine_id: UUID = Query(...),

    line_id: int = Query(...),

    db: AsyncSession = Depends(
        get_session
    ),
):
    
    data = await machine_sensor_raw_service.get_data_quality_summary(

        db,

        machine_id=machine_id,

        line_id=line_id,

        date_from=datefrom,

        date_to=dateTo,
    )


    return data




@router.get("/{run_id}", response_model=list[MachineSensorRawResponse])
async def get_raw_data(
    run_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await machine_sensor_raw_service.get_raw_by_run(db, run_id)


@router.get("/latest/{machine_id}", response_model=list[MachineSensorRawResponse])
async def get_latest_data(
    machine_id: UUID,
    limit: int = Query(50, ge=1, le=10_000),
    db: AsyncSession = Depends(get_session),
):
    return await machine_sensor_raw_service.get_latest_raw(db, machine_id, limit)


@router.get("/", response_model=MachineSensorRawQueryPageResponse)
async def get_machine_raw_data(
    datefrom: datetime = Query(
        ...,
        description="Inclusive start of the timestamp filter (ISO-8601).",
    ),
    dateTo: datetime = Query(
        ...,
        description="Inclusive end of the timestamp filter (ISO-8601).",
    ),
    machine_id: UUID = Query(..., description="Machine primary key (UUID)."),
    line_id: int = Query(..., ge=0, description="Line identifier stored on raw rows."),
    limit: int = Query(1_000, ge=1, le=10_000, description="Page size (max 10,000)."),
    offset: int = Query(0, ge=0, description="Pagination offset."),
    sort: Literal["asc", "desc"] = Query(
        "asc",
        description="Sort order by `timestamp` (`asc` for chronological export).",
    ),
    db: AsyncSession = Depends(get_session),
):
    """
    Return `machine_sensor_raw` rows for a machine, line, and inclusive time range.

    Results are paginated; use `has_more` and increase `offset` until no further pages.
    """
    _validate_time_range(datefrom, dateTo)
    sort_desc = sort == "desc"
    items, has_more = await machine_sensor_raw_service.get_raw_by_machine_line_time_range(
        db,
        machine_id=machine_id,
        line_id=line_id,
        date_from=datefrom,
        date_to=dateTo,
        limit=limit,
        offset=offset,
        sort_desc=sort_desc,
    )
    return MachineSensorRawQueryPageResponse(
        items=items,
        limit=limit,
        offset=offset,
        has_more=has_more,
    )




@router.post(
    "/",
    response_model=MachineSensorRawResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_machine_sensor_raw(
    payload: MachineSensorRawCreate,
    db: AsyncSession = Depends(get_session)
):
    return await machine_sensor_raw_service.create_raw(
        db,
        payload
    )



