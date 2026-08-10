import requests
from app.config import API_BASE_URL
from app.utils.logger import logger

def get_all_data():
    logger.info('requesting to get the data from APIs')
    data = {
        "machine_states": requests.get(f"{API_BASE_URL}/machine-state/default-machine-states").json(),
        "baseline_maps": requests.get(f"{API_BASE_URL}/baselines/baseline-maps").json(),
        "default-sensors":requests.get(f"{API_BASE_URL}/default-sensors").json(),
        "extruder-latest-values":requests.get(f"{API_BASE_URL}/dashboard/extruder-latest-values").json(),
    }

    return data


