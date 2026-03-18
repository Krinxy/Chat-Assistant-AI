import streamlit as st

from services.auth_service import register, login


def render_auth():
    st.title("🤖 Chat Assistant AI")
    tab_login, tab_register = st.tabs(["Login", "Register"])

    with tab_login:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login")

        if submitted:
            result = login(email, password)
            if result:
                st.session_state["authenticated"] = True
                st.session_state["token"] = result["access_token"]
                st.session_state["username"] = email.split("@")[0]
                st.rerun()
            else:
                st.error("Invalid credentials.")

    with tab_register:
        with st.form("register_form"):
            reg_email = st.text_input("Email", key="reg_email")
            reg_username = st.text_input("Username", key="reg_username")
            reg_password = st.text_input("Password", type="password", key="reg_pass")
            reg_submitted = st.form_submit_button("Register")

        if reg_submitted:
            result = register(reg_email, reg_username, reg_password)
            if result:
                st.success("Account created! Please log in.")
            else:
                st.error("Registration failed. Email or username may be taken.")
