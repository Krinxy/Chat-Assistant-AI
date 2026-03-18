import streamlit as st

from state.session_state import init_session_state
from components.notification_badge import render_notifications

st.set_page_config(page_title="Notifications", page_icon="🔔", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to see notifications.")
    st.stop()

st.title("🔔 Notifications")
render_notifications()
