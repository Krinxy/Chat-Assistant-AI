import streamlit as st


def init_session_state() -> None:
    st.session_state.setdefault("authenticated", False)
    st.session_state.setdefault("username", "User")
