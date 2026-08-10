from app.services.email_service import send_email
from app.utils.logger import logger
from app.templates.sensorAlert import build_email_template


sensorMapping = {1 : "ScrewSpeed_rpm",
  2 :"Pressure_bar",
  3 : "Temp_Zone1_C",
  4 : "Temp_Zone2_C", 
  5 : "Temp_Zone3_C", 
  6 : "Temp_Zone4_C"}


def alertContext(sensor,machine_State="",alert_context=[]):

    machine_State = str(machine_State).lower().replace(" ", "_")

    for context in alert_context:
        if sensorMapping[context['default_sensor_id']] == sensor :
            return context[machine_State]

    
    data = {
        "ScrewSpeed_rpm":{
            "PRODUCTION" : True,
            "HEATING UP" : False,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        },
        "Pressure_bar":{
            "PRODUCTION" : True,
            "HEATING UP" : False,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        },
        "Temp_Zone1_C":{
            "PRODUCTION" : True,
            "HEATING UP" : True,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        },
        "Temp_Zone2_C":{
            "PRODUCTION" : True,
            "HEATING UP" : True,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        },
        "Temp_Zone3_C":{
            "PRODUCTION" : True,
            "HEATING UP" : True,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        },
        "Temp_Zone4_C":{
            "PRODUCTION" : True,
            "HEATING UP" : True,
            "READY" : False,
            "OFF" : False,
            "COOLING DOWN" : False
        }
    }

    return False




SENSORS = [
    "ScrewSpeed_rpm",
    "Pressure_bar",
    "Temp_Zone1_C",
    "Temp_Zone2_C",
    "Temp_Zone3_C",
    "Temp_Zone4_C",
]

def getMinMaxValue(thresholds:list ,sensor:str):
    for sensorData in thresholds:
        if sensorMapping[sensorData['sensor_id']] == sensor:
            return sensorData['min_value'], sensorData['max_value']
    
    return None,None

def getEmailList(emailsData):
    tem = []
    for Item in emailsData:
        if Item["is_active"]:
            tem.append(Item["email"])
    return tem



def check_alerts(data):
    alert_status = data["alert_status"]
    machine_state = data["machine_state"]
    profile = data["material_profile"]
    alert_context = data["alert_context"]
    sensor_values = data["sensor_values"]
    emails = data["emails"]

    # print(machine_state)
    # print(profile)
    # print(sensor_values)
    # print(emails)

    if (alert_status):    
        logger.info("checking alerts...")
        thresholds = profile["thresholds"]
        for sensor in SENSORS:
            value = sensor_values[0][sensor]
            min_val, max_val = getMinMaxValue(thresholds=thresholds,sensor=sensor)
            if min_val: # to check the sensor limits exists
                # 🔴 Step 1: Range check
                if value < min_val or value > max_val:
                    print('limit check clear',sensor)
                    # 🔴 Step 2: Check alert context
                    allowed = alertContext(sensor,machine_state,alert_context)

                    if not allowed:
                        logger.info(f'Alert not allowed {sensor} -- {machine_state}')
                        continue

                    # 🔴 Step 3: Send email
                    condition = "below MIN" if value < min_val else "above MAX"

                    # subject = f"⚠️ Alert: {sensor}"
                    subject,body = build_email_template(sensor, value, min_val, max_val, condition, machine_state)
                    logger.info("Email Triggerd...")
                    # print(body)
                    send_email(subject, body, getEmailList(emails))
    else:
        logger.info("(Alert-service) Alert service is off.")