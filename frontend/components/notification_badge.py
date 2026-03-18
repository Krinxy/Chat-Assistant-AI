import streamlit as st

from services.notification_service import get_notifications, mark_read
from utils.formatters import format_datetime_str


def render_notifications():
    unread_only = st.toggle("Show unread only", value=False)

    with st.spinner("Loading notifications..."):
        notifications = get_notifications(unread_only=unread_only)

    if not notifications:
        st.info("No notifications.")
        return

    for notif in notifications:
        icon = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌"}.get(
            notif.get("notification_type", "info"), "ℹ️"
        )
        with st.container(border=True):
            col1, col2 = st.columns([5, 1])
            with col1:
                prefix = "" if notif.get("is_read") else "🔵 "
                st.markdown(f"{prefix}{icon} **{notif.get('title', '')}**")
                st.write(notif.get("message", ""))
                st.caption(format_datetime_str(notif.get("created_at", "")))
            with col2:
                if not notif.get("is_read"):
                    if st.button("Mark read", key=notif["id"]):
                        mark_read(notif["id"])
                        st.rerun()
