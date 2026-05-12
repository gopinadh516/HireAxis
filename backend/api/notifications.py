from fastapi import APIRouter
from db import supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
def list_notifications(user_id: str, unread_only: bool = False):
    query = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )
    if unread_only:
        query = query.eq("is_read", False)
    return query.execute().data


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str):
    result = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/read-all")
def mark_all_read(user_id: str):
    supabase.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    return {"success": True}
