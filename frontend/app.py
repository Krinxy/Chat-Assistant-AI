import streamlit as st

from src.app.store.session_state import init_session_state
from src.shared.components.feedback.auth_component import render_auth

st.set_page_config(
    page_title="Chat Assistant AI",
    page_icon="CA",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_session_state()


def main():
    if not st.session_state.get("authenticated"):
        render_auth()
        return

    st.sidebar.title("Chat Assistant AI")
    st.sidebar.markdown(f"Logged in as **{st.session_state.get('username', 'User')}**")

    if st.sidebar.button("Logout"):
        for key in tuple(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()

    st.title("Welcome to Chat Assistant AI")
    st.markdown(
        "Use the sidebar to navigate between features:\n"
        "- **Chat** - Converse with your AI assistant\n"
        "- **Recommendations** - Personalized suggestions\n"
        "- **Weather** - Live weather information\n"
        "- **Notifications** - Your activity alerts\n"
        "- **Profile** - Manage your profile\n"
        "- **Documents** - Upload and query documents\n"
    )


if __name__ == "__main__":
    main()
