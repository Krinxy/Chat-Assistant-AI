import streamlit as st

from state.session_state import init_session_state
from components.chat_component import render_chat

st.set_page_config(page_title="Chat", page_icon="💬", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to use the chat.")
    st.stop()

st.title("💬 Chat")
render_chat()
