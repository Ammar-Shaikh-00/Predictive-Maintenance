from app.utils.logger import logger
from app.services.email_service import send_email
from app.templates.stateChanged import build_email_template
from app.services.alert_service import getEmailList
from app.config import FRONTEND_URL
LAST_STATE = None  # global


def check_state(data):
    global LAST_STATE

    try:
        alert_status = data["alert_status"]
        current_state = data["machine_state"]
        recipients = data["email_recipients"]
        if alert_status:
            if current_state is None:
                logger.warning("No machine state received")
                return

            # first run case
            if LAST_STATE is None:
                LAST_STATE = current_state
                logger.info(f"Initial state set: {current_state}")
                return

            # check change
            if current_state != LAST_STATE:
                logger.info(f"State changed: {LAST_STATE} -> {current_state}")

                subject, body = build_email_template(
                    LAST_STATE, current_state,FRONTEND_URL
                )

                # 👉 multiple emails bhi support kar sakte ho
                # recipients = ["hassamdev722@gmail.com"]

                send_email(subject, body, getEmailList(recipients))

                # update state
                LAST_STATE = current_state

            else:
                logger.info("No state change")
        else:
            logger.info("(State-Change)Alert service is off.")
    except Exception as e:
        logger.error(f"check_state error: {e}")

