from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from app.models.material_profile import MaterialProfile
from app.models.profile_threshold import ProfileThreshold


async def create_material_profile(session, data):
    material = MaterialProfile(
        name=data.name,
        active=data.active
    )
    session.add(material)
    await session.flush()

    thresholds_list = []

    for t in data.thresholds:
        threshold = ProfileThreshold(
            sensor_id=t.sensor_id,
            material_id=material.id,
            min_value=t.min_value,
            max_value=t.max_value
        )
        session.add(threshold)

        thresholds_list.append({
            "sensor_id": t.sensor_id,
            "min_value": t.min_value,
            "max_value": t.max_value
        })

    await session.commit()

    return {
        "id": material.id,
        "name": material.name,
        "active": material.active,
        "thresholds": thresholds_list   # ✅ IMPORTANT
    }


async def get_all_material_profiles(session: AsyncSession):

    result = await session.execute(
        select(MaterialProfile).options(
            selectinload(MaterialProfile.thresholds)
            .selectinload(ProfileThreshold.sensor)
        )
    )

    materials = result.scalars().all()
    final = []
    print(materials)
    for m in materials:
        final.append({
            "id": m.id,
            "name": m.name,
            "active": m.active,
            "thresholds": [
                {
                    "sensor_id": t.sensor_id,
                    "sensor_name": t.sensor.name,   # ✅ YAHAN SE AYEGA
                    "min_value": t.min_value,
                    "max_value": t.max_value
                }
                for t in m.thresholds
            ]
        })

    return final


async def update_material_profile(session, material_id: int, data):
    result = await session.execute(
        select(MaterialProfile)
        .where(MaterialProfile.id == material_id)
        .options(selectinload(MaterialProfile.thresholds))
    )
    material = result.scalar_one_or_none()

    if not material:
        return None

    # Update basic fields
    material.name = data.name
    material.active = getattr(data, "active", True)

    # ❗ Remove old thresholds
    await session.execute(
        delete(ProfileThreshold).where(
            ProfileThreshold.material_id == material_id
        )
    )

    # ❗ Add new thresholds
    new_thresholds = [
        ProfileThreshold(
            material_id=material_id,
            sensor_id=t.sensor_id,
            min_value=t.min_value,
            max_value=t.max_value,
        )
        for t in data.thresholds
    ]

    session.add_all(new_thresholds)

    await session.commit()
    await session.refresh(material)

    # Reload updated data
    result = await session.execute(
        select(MaterialProfile)
        .where(MaterialProfile.id == material_id)
        .options(selectinload(MaterialProfile.thresholds))
    )
    temp = result.scalar_one()
    # print(temp)
    return temp


async def toggle_material_active(session, material_id: int):
    # Get current material
    result = await session.execute(
        select(MaterialProfile).where(MaterialProfile.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        return None

    # If activating → deactivate all others
    if not material.active:
        await session.execute(
            update(MaterialProfile)
            .where(MaterialProfile.id != material_id)
            .values(active=False)
        )
        material.active = True

    else:
        # If already active → deactivate it
        material.active = False

    await session.commit()
    await session.refresh(material)

    # ✅ Return fresh data with thresholds
    result = await session.execute(
        select(MaterialProfile)
        .where(MaterialProfile.id == material_id)
        .options(selectinload(MaterialProfile.thresholds))
    )

    return result.scalar_one()


# from sqlalchemy import delete, select

async def delete_material_profile(session, material_id: int):
    # Check if material exists
    result = await session.execute(select(MaterialProfile).where(MaterialProfile.id == material_id))
    material = result.scalar_one_or_none()

    if not material:
        return False

    # Delete thresholds first (cleanup)
    await session.execute(
        delete(ProfileThreshold).where(ProfileThreshold.material_id == material_id)
    )

    # Delete material profile
    await session.execute(delete(MaterialProfile).where(MaterialProfile.id == material_id))

    await session.commit()
    return True

