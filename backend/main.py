from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.jobs import router as jobs_router
from api.assignments import router as assignments_router
from api.notifications import router as notifications_router
from api.talents import router as talents_router
from api.public import router as public_router
from api.approvals import router as approvals_router
from api.users import router as users_router
from api.parse_jd import router as parse_jd_router
from api.pulse import router as pulse_router

app = FastAPI(title="HireAxis API", version="1.0.0")

ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import logging, traceback
    logging.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    origin = request.headers.get("origin", "")
    cors_origin = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]
    detail = str(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers={"Access-Control-Allow-Origin": cors_origin, "Access-Control-Allow-Credentials": "true"},
    )

app.include_router(jobs_router)
app.include_router(assignments_router)
app.include_router(notifications_router)
app.include_router(talents_router)
app.include_router(public_router)
app.include_router(approvals_router)
app.include_router(users_router)
app.include_router(parse_jd_router)
app.include_router(pulse_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "hireaxis-api"}
