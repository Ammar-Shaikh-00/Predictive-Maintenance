import requests
from app.config import API_BASE_URL
from app.utils.logger import logger

def get_all_data():
    logger.info('requesting to get the data from APIs')
    data = {
        "alert_status": requests.get(f"{API_BASE_URL}/alert-service").json()["status"],
        "machine_state": requests.get(f"{API_BASE_URL}/live-process-windows?limit=1").json()[0]['confirmed_state'],
        "material_profile": requests.get(f"{API_BASE_URL}/material-profiles/active").json(),
        "alert_context": requests.get(f"{API_BASE_URL}/alert-context").json(),
        "sensor_values": requests.get(f"{API_BASE_URL}/dashboard/extruder/latest?limit=1").json()["rows"],
        "emails": requests.get(f"{API_BASE_URL}/email-recipients").json(),
    }

    return data


def get_state():
    logger.info('requesting to get the state from Backend')
    data = {
        "alert_status": requests.get(f"{API_BASE_URL}/alert-service").json()["status"],
        "machine_state": requests.get(f"{API_BASE_URL}/live-process-windows?limit=1").json()[0]['confirmed_state'],
        "email_recipients": requests.get(f"{API_BASE_URL}/email-recipients").json(),
    }

    return data