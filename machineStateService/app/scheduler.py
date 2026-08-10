from apscheduler.schedulers.background import BackgroundScheduler
from app.services.fetch_service import get_all_data
from app.services.state_service import detect_machine_state
from app.config import CHECK_INTERVAL
from app.config import API_BASE_URL
from app.utils.logger import logger
import requests

scheduler = BackgroundScheduler()
# demoData = {
#     "machine_state":"PRODUCTION",
#     "material_profile":{
#             "id": 1,
#             "name": "Material1",
#             "active": True,
#             "thresholds": [
#                 {
#                 "sensor_id": 1,
#                 "min_value": 11,
#                 "max_value": 22
#                 }
#             ]
#         },
#     "sensor_values": [
#             {
#             "TrendDate": "2026-04-06T13:48:00+00:00",
#             "ScrewSpeed_rpm": 0.03999999910593033,
#             "Pressure_bar": 2.5,
#             "Temp_Zone1_C": 24.200000762939453,
#             "Temp_Zone2_C": 24.700000762939453,
#             "Temp_Zone3_C": 24.899999618530273,
#             "Temp_Zone4_C": 22.600000381469727
#             }
#         ],
#     "emails":[{"email":"hassamdev722@gmail.com","is_active":True}]

# }

PREV_STATE = ""



def job():
    global PREV_STATE
    logger.info("MachineStateDetection Job Executing...")
    try:
        data = get_all_data()
        # print(data)
        state =detect_machine_state(data)
        print(state)
        
        if state["machine_state_id"]==None:
            #please do not update the state of machine
            return
        elif state["machine_state_name"]!= PREV_STATE:
            PREV_STATE = state["machine_state_name"]
            payload = {"status":state["machine_state_name"]}

            response = requests.put(f"{API_BASE_URL}/machine-status", json=payload, timeout=5)

            if response.status_code == 200:
                PREV_STATE = state["machine_state_name"]  # ✅ update AFTER success
                logger.success(f"Machine status updated to: {PREV_STATE}")
            else:
                logger.error(
                    f"Failed to update status: {response.status_code} - {response.text}"
                )            


    except Exception as e:
        logger.error(f"From machineStateDetection Scheduler: {e}")

def start_scheduler():
    scheduler.add_job(job, "interval", seconds=CHECK_INTERVAL)
    scheduler.start()
    logger.info("scheduler job created.")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("Schedulers stopped.")