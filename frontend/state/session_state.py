import streamlit as st


def init_session_state():
    defaults = {
        "authenticated": False,
        "token": None,
        "username": None,
        "session_id": None,
        "messages": [],
    }
    for key, default in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = default


def clear_session():
    for key in list(st.session_state.keys()):
        del st.session_state[key]
