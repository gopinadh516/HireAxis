from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.jobs import router as jobs_router
from api.assignments import router as assignments_router
from api.notifications import router as notifications_router
from api.talents import router as talents_router
from api.public import router as public_router
from api.approvals import router as approvals_router

app = FastAPI(title="HireAxis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(assignments_router)
app.include_router(notifications_router)
app.include_router(talents_router)
app.include_router(public_router)
app.include_router(approvals_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "hireaxis-api"}
