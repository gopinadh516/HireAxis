import os
import secrets
import string
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import supabase

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: str
    role: str  # "manager" | "recruiter" — super_admin cannot be created via UI
    password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


def _random_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ── List all users ──────────────────────────────────────────────────────────

@router.get("/")
def list_users():
    res = supabase.table("users").select("*").order("created_at", desc=True).execute()
    return res.data


# ── Create user (super_admin only — enforced in frontend middleware) ─────────

@router.post("/")
def create_user(body: UserCreate):
    if body.role not in ("manager", "recruiter"):
        raise HTTPException(status_code=400, detail="role must be 'manager' or 'recruiter'")

    password = body.password or _random_password()

    # Create Supabase Auth user with role in user_metadata (used by middleware)
    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": body.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"role": body.role, "name": body.name},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    uid = auth_resp.user.id

    # Insert into public.users
    try:
        supabase.table("users").insert({
            "id": uid,
            "name": body.name,
            "email": body.email,
            "role": body.role,
        }).execute()
    except Exception as e:
        # Rollback auth user
        try:
            supabase.auth.admin.delete_user(uid)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": uid, "email": body.email, "role": body.role, "temp_password": password}


# ── Get single user ─────────────────────────────────────────────────────────

@router.get("/{user_id}")
def get_user(user_id: str):
    res = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data


# ── Update user (name / phone / avatar_url) ──────────────────────────────────

@router.patch("/{user_id}")
def update_user(user_id: str, body: UserUpdate):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    res = supabase.table("users").update(patch).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


# ── Toggle active/inactive ───────────────────────────────────────────────────

@router.patch("/{user_id}/toggle")
def toggle_user(user_id: str):
    cur = supabase.table("users").select("is_active").eq("id", user_id).single().execute()
    if not cur.data:
        raise HTTPException(status_code=404, detail="User not found")
    new_state = not cur.data["is_active"]
    res = supabase.table("users").update({"is_active": new_state}).eq("id", user_id).execute()
    return {"id": user_id, "is_active": new_state}


# ── Send password reset email ────────────────────────────────────────────────

@router.post("/{user_id}/reset-password")
def reset_password(user_id: str):
    cur = supabase.table("users").select("email").eq("id", user_id).single().execute()
    if not cur.data:
        raise HTTPException(status_code=404, detail="User not found")
    email = cur.data["email"]
    supabase.auth.reset_password_email(
        email,
        options={"redirect_to": f"{os.environ.get('SITE_URL', 'http://localhost:3000')}/login"},
    )
    return {"message": "Password reset email sent"}
