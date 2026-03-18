import streamlit as st

from services.chat_service import send_message, get_history, create_session
from state.session_state import init_session_state


def render_chat():
    init_session_state()

    if "session_id" not in st.session_state or not st.session_state.get("session_id"):
        session = create_session()
        if session:
            st.session_state["session_id"] = session.get("session_id")

    if "messages" not in st.session_state:
        st.session_state["messages"] = []

    for msg in st.session_state["messages"]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Type your message..."):
        st.session_state["messages"].append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                result = send_message(prompt, st.session_state.get("session_id"))
            if result:
                reply = result.get("message", "")
                st.session_state["session_id"] = result.get(
                    "session_id", st.session_state.get("session_id")
                )
                st.markdown(reply)
                st.session_state["messages"].append(
                    {"role": "assistant", "content": reply}
                )
            else:
                st.error("Failed to get a response.")
