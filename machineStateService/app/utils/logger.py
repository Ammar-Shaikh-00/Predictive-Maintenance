import logging
from pathlib import Path
import json
from datetime import datetime

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

LOG_FILE = LOG_DIR / "app.log"


# class JsonFormatter(logging.Formatter):

#     def format(self, record):

#         log_record = {
#             "time": datetime.utcnow().isoformat(),
#             "level": record.levelname,
#             "message": record.getMessage()
#         }

#         return json.dumps(log_record)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("MachineStateDetection")
# handler = logging.StreamHandler()

# handler.setFormatter(JsonFormatter())

# logger.addHandler(handler)

# logger.setLevel(logging.INFO)