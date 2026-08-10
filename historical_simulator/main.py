from fastapi import FastAPI, HTTPException
import pandas as pd
from threading import Lock

app = FastAPI()

CSV_FILE = "Tab_Actual.csv"

# Global storage
records = []
current_index = 0

# For concurrent requests safety
index_lock = Lock()


@app.on_event("startup")
def load_csv():

    global records

    print("Loading CSV...")

    df = pd.read_csv(
        CSV_FILE,
        low_memory=False
    )

    # Convert TrendDate to datetime
    df["TrendDate"] = pd.to_datetime(
        df["TrendDate"],
        errors="coerce"
    )

    # Remove invalid dates
    df = df.dropna(
        subset=["TrendDate"]
    )

    # Sort ascending
    df = df.sort_values(
        by="TrendDate",
        ascending=True
    )

    # Convert datetime back to string
    df["TrendDate"] = (
        df["TrendDate"]
        .dt.strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )

    records = df.to_dict(
        orient="records"
    )

    print(
        f"Loaded {len(records)} rows"
    )


@app.get("/example")
def get_next_record():

    global current_index

    with index_lock:

        if current_index >= len(records):

            return {
                "message":
                    "End reached",
                "total_records":
                    len(records)
            }

        row = records[
            current_index
        ]

        current_index += 1

        data = {"rows":row}

        # return {
        #     "record_number":
        #         current_index,

        #     "remaining":
        #         len(records)
        #         - current_index,

        #     "data":
        #         row
        # }

        return data


@app.get("/reset")
def reset():

    global current_index

    with index_lock:

        current_index = 0

    return {
        "message":
            "Pointer reset"
    }


@app.get("/status")
def status():

    return {

        "total_records":
            len(records),

        "current_position":
            current_index,

        "remaining":
            len(records)
            - current_index
    }


from pydantic import BaseModel


class IndexUpdateRequest(BaseModel):
    current_index: int


@app.post("/set-index")
def set_index(payload: IndexUpdateRequest):

    global current_index

    with index_lock:

        if payload.current_index < 0:
            raise HTTPException(
                status_code=400,
                detail="Index cannot be negative"
            )

        if payload.current_index >= len(records):
            raise HTTPException(
                status_code=400,
                detail=f"Index exceeds total records ({len(records)})"
            )

        current_index = payload.current_index

    return {
        "message": "Index updated successfully",
        "current_index": current_index,
        "remaining": len(records) - current_index
    }