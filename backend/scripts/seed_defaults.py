import requests
import sys
from typing import Dict

BASE_URL = "http://localhost:8002"
TIMEOUT = 15


DEFAULT_MACHINE_STATES = [
    {"name": "PRODUCTION", "priority": 1},
    {"name": "LOW_PRODUCTION", "priority": 2},
    {"name": "READY", "priority": 3},
    {"name": "HEATING", "priority": 4},
    {"name": "COOLING", "priority": 5},
    {"name": "OFF", "priority": 6},
]


DEFAULT_SENSORS = [
    {"name":"ScrewSpeed_rpm","map_val":"Val_1"},
    {"name":"Pressure_bar","map_val":"Val_6"},
    {"name":"Temp_Zone_1","map_val":"Val_7"},
    {"name":"Temp_Zone_2","map_val":"Val_8"},
    {"name":"Temp_Zone_3","map_val":"Val_9"},
    {"name":"Temp_Zone_4","map_val":"Val_10"},
    {"name":"motor_load","map_val":"Val_5"},
    {"name":"temp_avg","map_val":"temp_avg"},
    {"name":"screw_speed_mean","map_val":"screw_speed_mean"},
    {"name":"pressure_mean","map_val":"pressure_mean"},
    {"name":"load_mean","map_val":"load_mean"},
    {"name":"temperature_mean","map_val":"temperature_mean"},
    {"name":"temperature_trend","map_val":"temperature_trend"},
    {"name":"screw_speed_std","map_val":"screw_speed_std"},
]


BASELINE_TEMPLATE = {
    "baseline_name": "baseline1",
    "mappings": [
        {
            "machine_state_name": "PRODUCTION",
            "mappings": [
                {"sensor":"screw_speed_mean","min":50,"max":140},
                {"sensor":"pressure_mean","min":150,"max":420},
                {"sensor":"temperature_mean","min":150,"max":320},
                {"sensor":"screw_speed_std","min":0,"max":20},
            ]
        },
        {
            "machine_state_name":"LOW_PRODUCTION",
            "mappings":[
                {"sensor":"screw_speed_mean","min":10,"max":50},
                {"sensor":"pressure_mean","min":20,"max":150},
            ]
        },
        {
            "machine_state_name":"COOLING",
            "mappings":[
                {"sensor":"screw_speed_mean","min":0,"max":10},
                {"sensor":"pressure_mean","min":0,"max":50},
                {"sensor":"temperature_mean","min":100,"max":150},
                {"sensor":"temperature_trend","min":0,"max":0},
            ]
        },
        {
            "machine_state_name":"OFF",
            "mappings":[
                {"sensor":"screw_speed_mean","min":0,"max":5},
                {"sensor":"pressure_mean","min":0,"max":20},
                {"sensor":"load_mean","min":0,"max":5},
            ]
        }
    ]
}


session = requests.Session()


def get(path):
    r = session.get(
        f"{BASE_URL}{path}",
        timeout=TIMEOUT
    )
    r.raise_for_status()
    return r.json()


def post(path, data):
    r = session.post(
        f"{BASE_URL}{path}",
        json=data,
        timeout=TIMEOUT
    )
    r.raise_for_status()
    return r.json()


def ensure_machine_states():
    print("Checking machine states...")

    existing = get(
        "/machine-state/default-machine-states"
    )

    names = {
        x["name"]
        for x in existing
    }

    missing = [
        x
        for x in DEFAULT_MACHINE_STATES
        if x["name"] not in names
    ]

    if not missing:
        print("Machine states OK")
        return

    print(
        f"Inserting {len(missing)} machine states"
    )

    post(
        "/machine-state/default-machine-states",
        missing
    )


def ensure_sensors():
    print("Checking sensors...")

    existing = get(
        "/default-sensors"
    )

    names = {
        x["name"]
        for x in existing
    }

    for sensor in DEFAULT_SENSORS:

        if sensor["name"] in names:
            continue

        print(
            f"Adding sensor {sensor['name']}"
        )

        post(
            "/default-sensors",
            sensor
        )


def build_baseline_payload():

    states = get(
        "/machine-state/default-machine-states"
    )

    sensors = get(
        "/default-sensors"
    )

    state_map = {
        x["name"]:x["id"]
        for x in states
    }

    sensor_map = {
        x["name"]:x["id"]
        for x in sensors
    }

    mappings=[]

    for state in BASELINE_TEMPLATE["mappings"]:

        machine_state_id = state_map[
            state["machine_state_name"]
        ]

        sensor_rows=[]

        for s in state["mappings"]:

            sensor_rows.append({
                "sensor_id":
                    sensor_map[s["sensor"]],
                "min_value":
                    s["min"],
                "max_value":
                    s["max"]
            })

        mappings.append({
            "machine_state_id":
                machine_state_id,
            "mappings":
                sensor_rows
        })

    return {
        "baseline_name":
            BASELINE_TEMPLATE[
                "baseline_name"
            ],
        "mappings":
            mappings
    }


def ensure_baseline():

    existing = get(
        "/baselines/baseline-maps"
    )

    exists = any(
        x["baseline_name"]=="baseline1"
        for x in existing
    )

    if exists:
        print(
            "Baseline exists"
        )
        return

    payload = build_baseline_payload()

    print(
        "Creating baseline1"
    )

    post(
        "/baselines/baseline-maps",
        payload
    )


def main():

    try:

        ensure_machine_states()

        ensure_sensors()

        ensure_baseline()

        print(
            "\nSeed completed successfully"
        )

    except Exception as e:

        print(
            f"\nFAILED: {e}"
        )

        sys.exit(1)


if __name__=="__main__":
    main()