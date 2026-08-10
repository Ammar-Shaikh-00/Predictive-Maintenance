from apscheduler.schedulers.background import BackgroundScheduler
from app.services.fetch_service import get_all_data,get_state
from app.services.alert_service import check_alerts
from app.services.state_service import check_state
from app.config import CHECK_INTERVAL,STATE_INTERVAL
from app.utils.logger import logger

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


def state_change_detection_scheduler():
    logger.info("State Change Detection Executing...")
    try:
        data = get_state()
        # print(data)
        check_state(data)

    except Exception as e:
        logger.error(f"From Alert Scheduler: {e}")



def job():
    logger.info("Alert Job Executing...")
    try:
        data = get_all_data()
        # print(data)
        check_alerts(data)

    except Exception as e:
        logger.error(f"From Alert Scheduler: {e}")

def start_scheduler():
    scheduler.add_job(job, "interval", seconds=CHECK_INTERVAL)
    # second scheduler job
    scheduler.add_job(state_change_detection_scheduler, "interval", seconds=STATE_INTERVAL)
    scheduler.start()
    logger.info("scheduler job created.")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("Schedulers stopped.")