from fastapi import APIRouter, Depends
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select , delete
from sqlalchemy.exc import SQLAlchemyError
from collections import defaultdict
from app.db.session import get_session
from app.models.baseline import Baseline
from app.models.baseline_map import BaselineMap

from app.schemas.baseline_map import BaselineFullIn, BaselineFullOut
from app.schemas.baseline import BaselineOut

router = APIRouter(prefix="/baselines", tags=["Baseline"])


# -------------------- Baseline --------------------
@router.get("/", response_model=list[BaselineOut])
async def get_baselines(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Baseline))
    return result.scalars().all()




# -------------------- Baseline Maps --------------------


@router.get("/baseline-maps", response_model=list[BaselineFullOut])
async def get_baseline_full(db: AsyncSession = Depends(get_session)):

    result = await db.execute(
        select(
            Baseline.id,
            Baseline.name,
            BaselineMap.machine_state_id,
            BaselineMap.sensor_id,
            BaselineMap.min_value,
            BaselineMap.max_value
        )
        .join(BaselineMap, Baseline.id == BaselineMap.baseline_id)
    )

    rows = result.all()

    # ✅ Step 1: Group by baseline
    baseline_dict = {}

    for row in rows:
        baseline_id = row.id

        if baseline_id not in baseline_dict:
            baseline_dict[baseline_id] = {
                "id": baseline_id,
                "baseline_name": row.name,
                "mappings": defaultdict(list)
            }

        # ✅ Step 2: Group by machine_state inside baseline
        baseline_dict[baseline_id]["mappings"][row.machine_state_id].append({
            "sensor_id": row.sensor_id,
            "min_value": row.min_value,
            "max_value": row.max_value
        })

    # ✅ Step 3: Convert defaultdict → list format
    response = []

    for baseline in baseline_dict.values():
        machine_states = []

        for state_id, sensors in baseline["mappings"].items():
            machine_states.append({
                "machine_state_id": state_id,
                "mappings": sensors
            })

        response.append({
            "id": baseline["id"],
            "baseline_name": baseline["baseline_name"],
            "mappings": machine_states
        })

    return response


@router.post("/baseline-maps")
async def create_baseline_full(
    payload: BaselineFullIn,
    db: AsyncSession = Depends(get_session)
):
    try:
        # ✅ Create baseline
        baseline = Baseline(name=payload.baseline_name)
        db.add(baseline)
        await db.flush()

        # ✅ Flatten nested structure
        flat_mappings = []

        for state in payload.mappings:
            for sensor in state.mappings:
                flat_mappings.append(
                    BaselineMap(
                        baseline_id=baseline.id,
                        machine_state_id=state.machine_state_id,
                        sensor_id=sensor.sensor_id,
                        min_value=sensor.min_value,
                        max_value=sensor.max_value
                    )
                )

        db.add_all(flat_mappings)

        await db.commit()
        await db.refresh(baseline)

         # ✅ 3. FETCH AGAIN (for clean response)
        result = await db.execute(
            select(
                Baseline.id,
                Baseline.name,
                BaselineMap.machine_state_id,
                BaselineMap.sensor_id,
                BaselineMap.min_value,
                BaselineMap.max_value
            )
            .join(BaselineMap, Baseline.id == BaselineMap.baseline_id)
            .where(Baseline.id == baseline.id)
        )

        rows = result.all()

        # ✅ 4. GROUP (same as GET API)
        baseline_dict = {
            "id": baseline.id,
            "baseline_name": baseline.name,
            "mappings": defaultdict(list)
        }

        for row in rows:
            baseline_dict["mappings"][row.machine_state_id].append({
                "sensor_id": row.sensor_id,
                "min_value": row.min_value,
                "max_value": row.max_value
            })

        # ✅ 5. Convert to final format
        response = {
            "id": baseline_dict["id"],
            "baseline_name": baseline_dict["baseline_name"],
            "mappings": [
                {
                    "machine_state_id": state_id,
                    "mappings": sensors
                }
                for state_id, sensors in baseline_dict["mappings"].items()
            ]
        }

        return response

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/baseline-maps/{baseline_id}")
async def update_baseline_full(
    baseline_id: int,
    payload: BaselineFullIn,
    db: AsyncSession = Depends(get_session)
):
    try:
        # ✅ Check exists
        result = await db.execute(
            select(Baseline).where(Baseline.id == baseline_id)
        )
        baseline = result.scalar_one_or_none()

        if not baseline:
            raise HTTPException(status_code=404, detail="Baseline not found")

        # ✅ Update name
        baseline.name = payload.baseline_name

        # ✅ Delete old mappings
        await db.execute(
            delete(BaselineMap).where(
                BaselineMap.baseline_id == baseline_id
            )
        )

        # ✅ Flatten new mappings
        new_mappings = []

        for state in payload.mappings:
            for sensor in state.mappings:
                new_mappings.append(
                    BaselineMap(
                        baseline_id=baseline_id,
                        machine_state_id=state.machine_state_id,
                        sensor_id=sensor.sensor_id,
                        min_value=sensor.min_value,
                        max_value=sensor.max_value
                    )
                )

        db.add_all(new_mappings)

        await db.commit()

         # ✅ 5. Fetch updated data
        result = await db.execute(
            select(
                Baseline.id,
                Baseline.name,
                BaselineMap.machine_state_id,
                BaselineMap.sensor_id,
                BaselineMap.min_value,
                BaselineMap.max_value
            )
            .join(BaselineMap, Baseline.id == BaselineMap.baseline_id)
            .where(Baseline.id == baseline_id)
        )

        rows = result.all()

        # ✅ 6. Group (same as GET)
        grouped = {
            "id": baseline_id,
            "baseline_name": payload.baseline_name,
            "mappings": defaultdict(list)
        }

        for row in rows:
            grouped["mappings"][row.machine_state_id].append({
                "sensor_id": row.sensor_id,
                "min_value": row.min_value,
                "max_value": row.max_value
            })

        # ✅ 7. Final structure
        response = {
            "id": grouped["id"],
            "baseline_name": grouped["baseline_name"],
            "mappings": [
                {
                    "machine_state_id": state_id,
                    "mappings": sensors
                }
                for state_id, sensors in grouped["mappings"].items()
            ]
        }

        return response
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/baseline-maps/{baseline_id}")
async def delete_baseline(
    baseline_id: int,
    db: AsyncSession = Depends(get_session)
):
    try:
        result = await db.execute(
            select(Baseline).where(Baseline.id == baseline_id)
        )
        baseline = result.scalar_one_or_none()

        if not baseline:
            raise HTTPException(status_code=404, detail="Baseline not found")

        await db.delete(baseline)  # CASCADE will remove mappings
        await db.commit()

        return {"message": "Baseline deleted successfully"}

    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))