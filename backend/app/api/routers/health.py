from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_session
from app.core.config import get_settings
from app.services.ai_service_health import probe_ai_service_health

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
def health():
    """Basic health check"""
    return {
        "status": "ok",
        "service": "Predictive Maintenance Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "✅ Backend service is running successfully"
    }


@router.get("/health/live")
def liveness():
    """Liveness probe - indicates service is running"""
    return {
        "status": "alive",
        "service": "Predictive Maintenance Backend",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "✅ Service is alive and running"
    }


@router.get("/health/ready")
async def readiness(session: AsyncSession = Depends(get_session)):
    """Readiness probe - indicates service is ready to accept traffic"""
    try:
        # Check database connection
        await session.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "service": "Predictive Maintenance Backend",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "✅ Service is ready to accept requests"
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "service": "Predictive Maintenance Backend",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "message": "⚠️ Service is not ready - database connection failed"
        }


@router.get("/status")
async def system_status(session: AsyncSession = Depends(get_session)):
    """Comprehensive system status including all services"""
    status = {
        "service": "Predictive Maintenance Platform",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "backend": {
            "status": "running",
            "message": "✅ Backend service is operational"
        },
        "database": {
            "status": "unknown",
            "message": "Checking..."
        },
        "ai_service": {
            "status": "unknown",
            "message": "Checking...",
            "url": settings.ai_service_url
        },
        "endpoints": {
            "api_docs": "/docs",
            "health": "/health",
            "status": "/status",
            "dashboard": "/dashboard/overview"
        }
    }
    
    # Check database
    try:
        await session.execute(text("SELECT 1"))
        status["database"]["status"] = "connected"
        status["database"]["message"] = "✅ Database connection successful"
    except Exception as e:
        status["database"]["status"] = "disconnected"
        status["database"]["message"] = f"❌ Database connection failed: {str(e)}"
    
    health = await probe_ai_service_health()
    status["ai_service"]["url"] = health.url or settings.ai_service_url
    if health.healthy:
        status["ai_service"]["status"] = "running"
        status["ai_service"]["message"] = "✅ AI service is operational"
        if health.details:
            status["ai_service"]["details"] = health.details
    elif health.status == "unreachable":
        status["ai_service"]["status"] = "unreachable"
        status["ai_service"]["message"] = "❌ AI service is unreachable"
    else:
        status["ai_service"]["status"] = health.status or "unhealthy"
        extra = health.error or (
            f"status {health.http_status}" if health.http_status else health.status
        )
        status["ai_service"]["message"] = f"⚠️ AI service check failed: {extra}"

    return status

