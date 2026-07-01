from __future__ import annotations

from sqlalchemy import Boolean, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class Company(Base):
    """A CRM-style company record shown in the Company Workspace.

    Currently seeded demo data (see ``backend/scripts/seed_company_data.py``) rather than
    user-editable — the list/object fields below are stored as JSON since the frontend only
    ever displays them verbatim and never filters on their contents server-side.
    """

    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    segment: Mapped[str] = mapped_column(String(255), nullable=False)
    last_visited: Mapped[str] = mapped_column(String(64), nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    owner: Mapped[str] = mapped_column(String(255), nullable=False)
    open_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_meetings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_meetings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    portfolio_summary: Mapped[str] = mapped_column(Text, nullable=False)
    performance_summary: Mapped[str] = mapped_column(Text, nullable=False)

    assigned_roles: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    documents: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    hypotheses: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    appointments: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    notes: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    team_members: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    personas: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    newsfeed: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    recent_events: Mapped[list[str]] = mapped_column(JSON, nullable=False)


class PersonalColleague(Base):
    """A colleague appearing in the personal desk's assignee-select and invite senders."""

    __tablename__ = "personal_colleagues"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    function_name: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)


class PersonalAppointment(Base):
    """A personal-desk calendar entry, including pending meeting invites."""

    __tablename__ = "personal_appointments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    day_index: Mapped[int] = mapped_column(Integer, nullable=False)
    week_index: Mapped[int] = mapped_column(Integer, nullable=False)
    time_label: Mapped[str] = mapped_column(String(16), nullable=False)
    end_time_label: Mapped[str | None] = mapped_column(String(16), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    attendees: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invited_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rsvp: Mapped[str | None] = mapped_column(String(16), nullable=True)
