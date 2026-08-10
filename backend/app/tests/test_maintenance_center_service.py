from app.services.maintenance_center_service import build_calendar_events


def test_build_calendar_events_merges_kinds():
    events = build_calendar_events(
        history=[
            {
                "id": "1",
                "event_at": "2026-07-10T08:00:00Z",
                "action": "Oil change",
                "machine_id": "m1",
                "value_source": "LIVE",
            }
        ],
        plans=[
            {
                "id": "2",
                "planned_at": "2026-07-15T00:00:00Z",
                "title": "Screw inspection",
                "machine_id": "m1",
                "status": "planned",
                "value_source": "MANUAL",
            }
        ],
        wear_parts=[
            {
                "id": "3",
                "next_replace_at": "2026-07-20T00:00:00Z",
                "name": "Seal kit",
                "machine_id": "m1",
                "value_source": "MANUAL",
            }
        ],
    )
    assert len(events) == 3
    kinds = {e["kind"] for e in events}
    assert kinds == {"history", "planned", "wear"}
    assert events[0]["date"] == "2026-07-10"
