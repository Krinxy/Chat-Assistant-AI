import streamlit as st

from services.recommendation_service import get_recommendations


def render_recommendations():
    with st.spinner("Loading recommendations..."):
        data = get_recommendations()

    if not data:
        st.info("No recommendations available. Start chatting to personalise!")
        return

    recs = data.get("recommendations", [])
    if not recs:
        st.info("No recommendations yet.")
        return

    cols = st.columns(2)
    for i, rec in enumerate(recs):
        with cols[i % 2]:
            with st.container(border=True):
                st.subheader(rec.get("title", ""))
                st.caption(f"Category: {rec.get('category', '').title()}")
                st.write(rec.get("description", ""))
                st.progress(min(rec.get("score", 0), 1.0), text=f"Score: {rec.get('score', 0):.2f}")
