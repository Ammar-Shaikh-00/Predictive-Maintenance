import asyncio
from datetime import datetime
from pathlib import Path
import os
from typing import Optional

from loguru import logger

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.routers import (
    ai,
    alarms,
    attachments,
    audit,
    baseline_registry,
    connections,
    dashboard,
    email_recipients,
    health,
    history,
    jobs,
    knowledge,
    live_feature_evaluation,
    live_ml_export,
    live_process_window,
    live_run_evaluation,
    machine_state,
    operations_hardening,
    operations_center,
    maintenance_center,
    energy_center,
    executive_view,
    machines,
    metrics,
    notifications,
    predictions,
    profiles,
    realtime,
    reports,
    roles,
    sensor_data,
    sensors,
    settings as settings_router,
    system,
    tickets,
    users,
    webhooks,
    material_profiles,
    default_sensor,
    alert_service,
    alert_context,
    baseline,
    machine_status,
    window_features,
    production_run,
    machine_sensor_raw,
    historical_runs,
)
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.services import notification_service
from app.services.extruder_pressure_alert_service import pressure_alert_loop
from app.services.incident_manager import incident_manager
from sqlalchemy import text

settings = get_settings()

# Background task for pressure alerts (data from TimescaleDB, same as /dashboard/extruder/latest)
_pressure_alert_task: Optional[asyncio.Task] = None

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    debug=settings.debug,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Custom OpenAPI schema to ensure proper version field
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.project_name,
        version="1.0.0",
        description="Predictive Maintenance Platform API - Complete API for managing machines, sensors, predictions, alarms, and more.",
        routes=app.routes,
    )
    # Explicitly set OpenAPI version to 3.1.0
    openapi_schema["openapi"] = "3.1.0"
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

_cors_origins = [
    o.strip()
    for o in (settings.cors_origins or "").split(",")
    if o.strip()
]
if not _cors_origins:
    _cors_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Performance optimizations
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB

# Custom exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """
    Provide helpful 404 messages for unknown routes.

    Important: endpoints may legitimately raise HTTPException(status_code=404) for domain
    conditions (e.g., "machine not found"). In that case, preserve the real detail
    instead of reporting "Endpoint not found".
    """
    exc_detail = getattr(exc, "detail", None)
    if exc_detail and exc_detail != "Not Found":
        return JSONResponse(
            status_code=404,
            content={
                "detail": exc_detail,
                "path": str(request.url.path),
            },
        )

    return JSONResponse(
        status_code=404,
        content={
            "detail": f"Endpoint not found: {request.url.path}",
            "message": "The requested endpoint does not exist. Here are some available endpoints:",
            "available_endpoints": {
                "root": "/",
                "health": "/health",
                "status": "/status",
                "api_docs": "/docs",
                "openapi": "/openapi.json",
                "dashboard": "/dashboard/overview",
                "ai_status": "/ai/status",
                "machines": "/machines",
                "sensors": "/sensors",
                "predictions": "/predictions",
                "alarms": "/alarms",
                "tickets": "/tickets",
                "reports": "/reports/generate",
            },
            "tip": "Visit /docs for the complete API documentation",
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Provide helpful validation error messages"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "message": "The request data is invalid. Please check your input.",
            "errors": exc.errors(),
            "path": str(request.url.path)
        }
    )

reports_dir = settings.reports_dir
reports_dir.mkdir(parents=True, exist_ok=True)

# Include machine_state router first for debugging
logger.info(f"Before machine_state inclusion: {len(app.routes)} routes")
logger.info(f"Machine state router has {len(machine_state.router.routes)} routes")
app.include_router(machine_state.router)
logger.info(f"After machine_state inclusion: {len(app.routes)} routes")

app.include_router(health.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(machines.router)
app.include_router(sensors.router)
app.include_router(sensor_data.router)
app.include_router(predictions.router)
app.include_router(alarms.router)
app.include_router(tickets.router)
app.include_router(reports.router)  # Must be before static mount to handle /reports/download routes
app.include_router(notifications.router)
app.include_router(email_recipients.router)
app.include_router(knowledge.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(profiles.router)
app.include_router(ai.router)
app.include_router(settings_router.router)
app.include_router(connections.router)
app.include_router(system.router)
app.include_router(webhooks.router)
app.include_router(audit.router)
app.include_router(realtime.router)
app.include_router(attachments.router)
app.include_router(metrics.router)
app.include_router(jobs.router)
app.include_router(material_profiles.router)
app.include_router(default_sensor.router)
app.include_router(alert_service.router)
app.include_router(alert_context.router)
app.include_router(baseline.router)
app.include_router(baseline_registry.router)
app.include_router(machine_status.router)
app.include_router(live_process_window.router)
app.include_router(live_feature_evaluation.router)
app.include_router(live_run_evaluation.router)
app.include_router(live_ml_export.router)
app.include_router(window_features.router)
app.include_router(production_run.router)
app.include_router(historical_runs.router)
app.include_router(machine_sensor_raw.router)
app.include_router(operations_hardening.router)
app.include_router(operations_center.router)
app.include_router(maintenance_center.router)
app.include_router(energy_center.router)
app.include_router(executive_view.router)

# Mount static files AFTER routers so router routes take precedence
app.mount("/reports", StaticFiles(directory=reports_dir), name="reports")


@app.get("/")
async def root():
    """Root endpoint - shows system information and available endpoints"""
    return {
        "service": "Predictive Maintenance Platform",
        "version": "1.0.0",
        "status": "running",
        "message": "Backend API is running successfully",
        "timestamp": datetime.utcnow().isoformat(),
            "endpoints": {
            "health": "/health",
            "status": "/status",
            "api_docs": "/docs",
            "openapi": "/openapi.json",
            "dashboard": "/dashboard/overview",
            "ai_status": "/ai/status"
        },
        "services": {
            "backend": "Running",
            "database": "Check /health/ready",
            "ai_service": "Check /ai/status"
        }
    }


@app.on_event("startup")
async def startup_event():
    # Optional clean slate reset (MANDATORY for commissioning/testing).
    # Guarded by env var so production deployments are not destructive by default.
    async def create_hypertable():
        async with AsyncSessionLocal() as db:
            await db.execute(text("""
                SELECT create_hypertable(
                    'machine_sensor_raw',
                    'timestamp',
                    if_not_exists => TRUE
                );
            """))
            await db.commit()
    
    if os.getenv("CLEAN_SLATE_ON_STARTUP", "false").lower() in {"1", "true", "yes"}:
        try:
            from sqlalchemy import delete
            from app.models.ticket import Ticket
            from app.models.alarm import Alarm

            async with AsyncSessionLocal() as session:
                await session.execute(delete(Ticket))
                await session.execute(delete(Alarm))
                await session.commit()
            incident_manager.reset_runtime_state()
            logger.warning("Clean-slate reset applied on startup (alarms/tickets cleared)")
        except Exception as e:
            logger.error(f"Clean-slate reset failed: {e}")

    # Sensor data source: TimescaleDB only (MSSQL poller is no longer used).
    # Ensure TSDB_HOST, TSDB_USER, TSDB_PASSWORD are set for live charts and pressure alerts.
    logger.info("Sensor data source: TimescaleDB (MSSQL poller disabled)")
    
    # DISABLED: Direct sensor data simulation - using real sensor data from TimescaleDB
    # from app.tasks.sensor_data_simulator import start_sensor_data_simulation
    # loop.create_task(start_sensor_data_simulation(interval_seconds=2))
    
    await asyncio.sleep(0.5)
    logger.info("Startup complete - extruder data from TimescaleDB")

    # ENABLED: Demo users and machines for auth / machine state detection (no dummy sensor data - charts use TimescaleDB only)
    try:
        from app.tasks.seed_demo_data import seed_demo_users, seed_sample_machines

        logger.info("Ensuring demo users exist (admin/engineer/viewer)")
        await seed_demo_users()
        logger.info("Demo users verified/created")

        logger.info("Ensuring demo machines exist for state testing")
        await seed_sample_machines()
        logger.info("Demo machines created for machine state detection")
    except Exception as e:
        logger.error(f"Failed to ensure demo data: {e}")
    
    # Verify email configuration if available (non-blocking best-effort check)
    verify_email = getattr(notification_service, "verify_email_transport", None)
    if verify_email:
        await verify_email()
    if notification_service.email_configured():
        ready, err = notification_service.email_status()
        if ready:
            logger.info("Email notifications: configured and SMTP transport verified")
        else:
            logger.warning("Email notifications: SMTP credentials set but verification failed - %s", err or "unknown")
    else:
        logger.warning(
            "Email notifications: NOT configured. Set EMAIL_SMTP_HOST, EMAIL_SMTP_USER, EMAIL_SMTP_PASS in backend/.env to enable pressure/alert emails."
        )

    

    # Log TimescaleDB connection status
    try:
        from app.services import tsdb_client
        if tsdb_client.tsdb_configured():
            ok, msg = await tsdb_client.check_tsdb_connection()
            if ok:
                logger.info("TimescaleDB – sensor data source for live charts. Connection OK: %s", msg)
            else:
                logger.warning("TimescaleDB configured but connection check failed: %s", msg)
        else:
            logger.warning(
                "TimescaleDB not configured. Set TSDB_HOST, TSDB_USER, TSDB_PASSWORD for extruder live data."
            )
    except Exception as e:
        logger.debug("TimescaleDB startup check failed: %s", e)


@app.on_event("shutdown")
async def shutdown_event():
    global _pressure_alert_task
    if _pressure_alert_task and not _pressure_alert_task.done():
        _pressure_alert_task.cancel()
        try:
            await _pressure_alert_task
        except asyncio.CancelledError:
            pass
    logger.info("Backend shutdown complete")

