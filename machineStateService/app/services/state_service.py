# from app.utils.logger import logger
# from typing import List, Dict, Any, Optional


# def get_machine_state_by_priority(
#     priority_mappings: List[Dict[str, Any]],
#     machine_state_items: List[Dict[str, Any]],
#     priority: int
# ) -> Optional[Dict[str, Any]]:
#     """
#     Returns machine_state_item based on given priority.

#     :param priority_mappings: List of priority mappings
#     :param machine_state_items: List of machine state items
#     :param priority: Priority number (1-6)
#     :return: Matching machine_state_item or None
#     """

#     if not isinstance(priority, int):
#         raise ValueError("priority must be an integer")

#     # Step 1: Find mapping with given priority
#     state_mapping = next(
#         (p for p in priority_mappings if p.get("priority") == priority),
#         None
#     )

#     if not state_mapping:
#         return None  # ya raise error agar strict chahiye

#     machine_state_id = state_mapping.get("id")

#     # Step 2: Find machine state item
#     machine_state = next(
#         (m for m in machine_state_items if m.get("machine_state_id") == machine_state_id),
#         None
#     )

#     return machine_state

# STATES_LEN = 0  # global


# SENSOR_MAP = {
#     1:"Val_1",
#     2:"Val_6",
#     3:"Val_7",
#     4:"Val_8",
#     5:"Val_9",
#     6:"Val_10"}


# def check_state(data):
#     global STATES_LEN

#     try:
#         machine_states = data["machine_states"]
#         baseline_maps=data["baseline_maps"]
#         default_sensors=data["default-sensors"],
#         extruder_latest_values=data["extruder-latest-values"]
#         if machine_states:
#             STATES_LEN = len(machine_states) 
#         if baseline_maps:
#             for baseline in baseline_maps:
#                 print(baseline)
#                 for i in range(1,STATES_LEN+1): # this loop gives priority number
#                     machine_state_item = get_machine_state_by_priority(machine_states,baseline.get("mappings"),i)
#                     print(machine_state_item)

#     except Exception as e:
#         logger.error(f"machineStateDetection: error: {e}")



from app.utils.logger import logger
from typing import List, Dict, Any, Optional
from collections import deque

# Rolling window config
WINDOW_SIZE = 5
CONFIRMATION_COUNT = 3

history = deque(maxlen=WINDOW_SIZE)
current_candidate = None
last_confirmed_state = None
state_streak = 0




def get_machine_state_by_priority(
    priority_mappings: List[Dict[str, Any]],
    machine_state_items: List[Dict[str, Any]],
    priority: int
) -> Optional[Dict[str, Any]]:

    state_mapping = next(
        (p for p in priority_mappings if p.get("priority") == priority),
        None
    )

    if not state_mapping:
        return None

    machine_state_id = state_mapping.get("id")

    return next(
        (m for m in machine_state_items if m.get("machine_state_id") == machine_state_id),
        None
    )


def get_state_meta_by_id(machine_states: List[Dict[str, Any]], state_id: int):
    return next(
        (s for s in machine_states if s.get("id") == state_id),
        None
    )

COOLING_STATE_ID = 5
SENSOR_MAP = {
    1: "Val_1",
    2: "Val_6",
    3: "Val_7",
    4: "Val_8",
    5: "Val_9",
    6: "Val_10",
    7: "Val_5",
    8:"temp_avg"
}


def is_state_matching(machine_state_item: Dict[str, Any], latest_values: Dict[str, Any]) -> bool:

    for sensor in machine_state_item.get("mappings", []):
        sensor_id = sensor.get("sensor_id")
        min_val = sensor.get("min_value")
        max_val = sensor.get("max_value")

        val_key = SENSOR_MAP.get(sensor_id)

        if not val_key:
            logger.warning(f"Sensor mapping missing for sensor_id={sensor_id}")
            return False

        actual_value = latest_values.get(val_key)

        if actual_value is None:
            logger.warning(f"Missing value for {val_key}")
            return False

        if not (min_val <= actual_value <= max_val):
            return False

    return True


def detect_candidate_state(machine_states, baseline_maps, latest_values):

    machine_states_sorted = sorted(machine_states, key=lambda x: x.get("priority", 999))
    max_priority = len(machine_states_sorted)

    for baseline in baseline_maps:
        machine_state_items = baseline.get("mappings", [])

        for priority in range(1, max_priority + 1):

            machine_state_item = get_machine_state_by_priority(
                machine_states_sorted,
                machine_state_items,
                priority
            )

            if not machine_state_item:
                continue

            if is_state_matching(machine_state_item, latest_values):

                state_meta = get_state_meta_by_id(
                    machine_states_sorted,
                    machine_state_item["machine_state_id"]
                )

                return {
                    "machine_state_id": state_meta["id"],
                    "machine_state_name": state_meta["name"],
                    "priority": state_meta["priority"]
                }

    return {
        "machine_state_id": None,
        "machine_state_name": "UNKNOWN",
        "priority": None
    }


def detect_machine_state(data: Dict[str, Any]) -> Dict[str, Any]:
    global last_confirmed_state, state_streak, current_candidate

    try:
        machine_states = data.get("machine_states", [])
        baseline_maps = data.get("baseline_maps", [])
        latest_values = data.get("extruder-latest-values", {}).get("rows", {})

        if len(machine_states) == 0 and len(baseline_maps) == 0 and len(latest_values) == 0:
            logger.error("API issue: response data is empty")
            return {
                "machine_state_id": None,
                "machine_state_name": "UNKNOWN",
                "priority": None
            }

        # ============================
        # STEP 1: ADD TO WINDOW
        # ============================
        history.append(latest_values)

        if len(history) < 3:
            return {
                "machine_state_id": None,
                "machine_state_name": "INITIALIZING",
                "priority": None
            }

        # ============================
        # STEP 2: GET CANDIDATE STATE
        # ============================
        candidate = detect_candidate_state(
            machine_states,
            baseline_maps,
            latest_values
        )

        candidate_name = candidate["machine_state_name"]

        # ============================
        # STEP 3: CONFIRMATION LOGIC
        # ============================
        if candidate_name == current_candidate:
            state_streak += 1
        else:
            current_candidate = candidate_name
            state_streak = 1

        # ============================
        # STEP 4: CONFIRM STATE
        # ============================
        if state_streak >= CONFIRMATION_COUNT:
            if current_candidate != last_confirmed_state:
                logger.info(f"State changed: {last_confirmed_state} -> {current_candidate}")
                last_confirmed_state = current_candidate

        logger.info(
            f"Candidate: {candidate_name}, Confirmed: {last_confirmed_state}, Streak: {state_streak}"
        )

        # ============================
        # STEP 5: RETURN CONFIRMED STATE
        # ============================
        if last_confirmed_state:
            # find full meta again
            state_meta = next(
                (s for s in machine_states if s["name"] == last_confirmed_state),
                None
            )

            if state_meta:
                return {
                    "machine_state_id": state_meta["id"],
                    "machine_state_name": state_meta["name"],
                    "priority": state_meta["priority"]
                }

        return {
            "machine_state_id": None,
            "machine_state_name": "INITIALIZING",
            "priority": None
        }

    except Exception as e:
        logger.error(f"detect_machine_state error: {e}")
        return {
            "machine_state_id": None,
            "machine_state_name": "UNKNOWN",
            "priority": None
        }