import streamlit as st

from state.session_state import init_session_state
from services.profile_service import get_profile, update_profile

st.set_page_config(page_title="Profile", page_icon="👤", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to manage your profile.")
    st.stop()

st.title("👤 Profile")

profile = get_profile()
if profile:
    with st.form("profile_form"):
        interests_str = st.text_input(
            "Interests (comma-separated)",
            value=", ".join(profile.get("interests", [])),
        )
        locations_str = st.text_input(
            "Saved Locations (comma-separated)",
            value=", ".join(profile.get("locations", [])),
        )
        submitted = st.form_submit_button("Save Profile")

    if submitted:
        updates = {
            "interests": [i.strip() for i in interests_str.split(",") if i.strip()],
            "locations": [l.strip() for l in locations_str.split(",") if l.strip()],
        }
        result = update_profile(updates)
        if result:
            st.success("Profile updated!")
        else:
            st.error("Failed to update profile.")
else:
    st.error("Could not load profile.")
