import streamlit as st

from services.weather_service import get_weather, get_saved_locations, add_location


def render_weather():
    saved = get_saved_locations() or []
    suggestions = saved + ["London", "New York", "Tokyo", "Paris", "Sydney"]
    unique_suggestions = list(dict.fromkeys(suggestions))

    col1, col2 = st.columns([3, 1])
    city = col1.selectbox("Select a city", options=unique_suggestions)
    custom_city = col2.text_input("Or enter city")

    search_city = custom_city.strip() or city

    if st.button("Get Weather"):
        with st.spinner(f"Fetching weather for {search_city}..."):
            data = get_weather(search_city)

        if data:
            st.subheader(f"🌤 {data.get('city', search_city)}")
            col_a, col_b, col_c = st.columns(3)
            col_a.metric("Temperature", f"{data.get('temperature', 0):.1f}°C")
            col_b.metric("Feels Like", f"{data.get('feels_like', 0):.1f}°C")
            col_c.metric("Humidity", f"{data.get('humidity', 0)}%")
            st.write(f"**Conditions:** {data.get('description', '').title()}")
            st.write(f"**Wind Speed:** {data.get('wind_speed', 0)} m/s")

            if st.button("Save this location"):
                add_location(search_city)
                st.success(f"'{search_city}' saved!")
        else:
            st.error(f"Could not fetch weather for '{search_city}'.")
