from __future__ import annotations

import pytest

from backend.app.models.company import Company, PersonalAppointment, PersonalColleague

from .conftest import TestSessionLocal

pytestmark = pytest.mark.asyncio


async def _seed_one_of_each() -> None:
    async with TestSessionLocal() as db:
        db.add(
            Company(
                id="aurora-bank",
                name="Aurora Bank",
                segment="Fintech",
                last_visited="10:22",
                is_favorite=True,
                assigned_roles=["admin", "analyst"],
                owner="M. Ritter",
                open_questions=6,
                completed_questions=26,
                pending_meetings=2,
                completed_meetings=9,
                documents=["Q2 Risiko-Radar"],
                hypotheses=[{"text": "Antwortquote steigt.", "status": "confirmed"}],
                appointments=["Mo 09:00 Sprint Review | Lena"],
                notes=["Legal review needed."],
                team_members=["Sales: Lena"],
                personas=["Head of Risk"],
                newsfeed=["Pilot region expanded."],
                recent_events=["Heute: Follow-up geplant."],
                portfolio_summary="2 aktive Produkte.",
                performance_summary="81% beantwortet.",
            )
        )
        db.add(PersonalColleague(id="colleague-sophie", function_name="Product Manager", full_name="Sophie Reiter"))
        db.add(
            PersonalAppointment(
                id="personal-001",
                day_index=0,
                week_index=0,
                time_label="08:30",
                end_time_label="09:00",
                title="Daily Standup",
                attendees=["Sophie Reiter"],
                recurring=True,
            )
        )
        await db.commit()


async def test_list_companies_returns_seeded_row(user_client):
    await _seed_one_of_each()

    response = await user_client.get("/api/company/companies")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "aurora-bank"
    assert body[0]["assigned_roles"] == ["admin", "analyst"]
    assert body[0]["hypotheses"] == [
        {
            "text": "Antwortquote steigt.",
            "status": "confirmed",
            "title": None,
            "description": None,
            "source_document": None,
            "source_meeting_id": None,
        }
    ]


async def test_list_personal_colleagues_returns_seeded_row(user_client):
    await _seed_one_of_each()

    response = await user_client.get("/api/company/personal-colleagues")

    assert response.status_code == 200
    body = response.json()
    assert body == [{"id": "colleague-sophie", "function_name": "Product Manager", "full_name": "Sophie Reiter"}]


async def test_list_personal_appointments_returns_seeded_row(user_client):
    await _seed_one_of_each()

    response = await user_client.get("/api/company/personal-appointments")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "personal-001"
    assert body[0]["attendees"] == ["Sophie Reiter"]


async def test_company_endpoints_require_auth(anon_client):
    response = await anon_client.get("/api/company/companies")

    assert response.status_code == 401
