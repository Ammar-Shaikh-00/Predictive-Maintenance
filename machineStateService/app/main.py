from fastapi import FastAPI
from app.scheduler import start_scheduler,stop_scheduler
from app.utils.logger import logger
app = FastAPI()

@app.on_event("startup")
def startup():
    logger.info("App is starting...")
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()

@app.get("/")
def read_root():
    return {"status": "Machine State Detection service is running"}