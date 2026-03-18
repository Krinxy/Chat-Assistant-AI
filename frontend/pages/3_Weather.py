import streamlit as st

from state.session_state import init_session_state
from components.weather_widget import render_weather

st.set_page_config(page_title="Weather", page_icon="🌤", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to see weather.")
    st.stop()

st.title("🌤 Weather")
render_weather()
