import smtplib
from email.mime.text import MIMEText
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
from app.utils.logger import logger


# def send_email(subject, body, recipients):
#     msg = MIMEText(body, "html", "utf-8")
#     msg["Subject"] = subject
#     msg["From"] = SMTP_USER
#     msg["To"] = ", ".join(recipients)

#     with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
#         server.starttls()
#         server.login(SMTP_USER, SMTP_PASS)
#         server.sendmail(SMTP_USER, recipients, msg.as_string())
    
#     logger.info("mail sent")


def send_email(subject, body, recipients):
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)

            for recipient in recipients:
                try:
                    msg = MIMEText(body, "html", "utf-8")
                    msg["Subject"] = subject
                    msg["From"] = SMTP_USER
                    msg["To"] = recipient  # only one user visible

                    server.sendmail(SMTP_USER, [recipient], msg.as_string())

                    logger.info(f"Email sent to: {recipient}")

                except Exception as e:
                    logger.error(f"Failed to send email to {recipient}: {e}")

    except Exception as e:
        logger.error(f"SMTP connection error: {e}")