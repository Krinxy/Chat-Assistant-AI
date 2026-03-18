import streamlit as st

from state.session_state import init_session_state
from components.recommendation_card import render_recommendations

st.set_page_config(page_title="Recommendations", page_icon="⭐", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to see recommendations.")
    st.stop()

st.title("⭐ Recommendations")
render_recommendations()
