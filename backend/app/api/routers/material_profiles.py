
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.session import get_session
from app.schemas.material_profile import (
    MaterialProfileCreate,
    MaterialProfileRead
)
from sqlalchemy import select
from app.models.material_profile import MaterialProfile
from app.services import material_profile_service

router = APIRouter(prefix="/material-profiles", tags=["Material Profiles"])


@router.post("", response_model=MaterialProfileRead)
async def create_material(
    data: MaterialProfileCreate,
    session: AsyncSession = Depends(get_session),
):
    return await material_profile_service.create_material_profile(session, data)


@router.get("", response_model=list[MaterialProfileRead])
async def list_materials(
    session: AsyncSession = Depends(get_session),
):
    return await material_profile_service.get_all_material_profiles(session)


# ✅ PUT (UPDATE MATERIAL PROFILE)
@router.put("/{material_id}", response_model=MaterialProfileRead)
async def update_material(
    material_id: int,
    data: MaterialProfileCreate,
    session: AsyncSession = Depends(get_session),
):
    updated_material = await material_profile_service.update_material_profile(
        session, material_id, data
    )

    if not updated_material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material profile not found",
        )

    return updated_material

# from fastapi import HTTPException, status

@router.patch("/{material_id}/toggle", response_model=MaterialProfileRead)
async def toggle_material(
    material_id: int,
    session: AsyncSession = Depends(get_session),
):
    material = await material_profile_service.toggle_material_active(
        session, material_id
    )

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    return material


# from fastapi import HTTPException, status

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(material_id: int, session: AsyncSession = Depends(get_session)):
    success = await material_profile_service.delete_material_profile(session, material_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material profile not found",
        )

    return None  # 204 No Content


@router.get("/active", response_model=MaterialProfileRead)
async def get_active_material(session: AsyncSession = Depends(get_session)):
    """
    Get the currently active material profile along with its thresholds
    """
    result = await session.execute(
        select(MaterialProfile)
        .where(MaterialProfile.active == True)
        .options(selectinload(MaterialProfile.thresholds))
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(status_code=404, detail="No active material found")

    return material
