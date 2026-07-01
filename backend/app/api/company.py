from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.company import Company, PersonalAppointment, PersonalColleague
from ..models.user import User
from ..services.dependency.authtoken import authtoken

router = APIRouter(prefix="/company", tags=["company"])


class HypothesisEntryResponse(BaseModel):
    text: str
    status: str
    title: str | None = None
    description: str | None = None
    source_document: str | None = None
    source_meeting_id: str | None = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    segment: str
    last_visited: str
    is_favorite: bool
    assigned_roles: list[str]
    owner: str
    open_questions: int
    completed_questions: int
    pending_meetings: int
    completed_meetings: int
    documents: list[str]
    hypotheses: list[HypothesisEntryResponse]
    appointments: list[str]
    notes: list[str]
    team_members: list[str]
    personas: list[str]
    newsfeed: list[str]
    recent_events: list[str]
    portfolio_summary: str
    performance_summary: str

    model_config = {"from_attributes": True}


class PersonalColleagueResponse(BaseModel):
    id: str
    function_name: str
    full_name: str

    model_config = {"from_attributes": True}


class PersonalAppointmentResponse(BaseModel):
    id: str
    day_index: int
    week_index: int
    time_label: str
    end_time_label: str | None
    title: str
    attendees: list[str]
    description: str | None
    recurring: bool
    invited_by: str | None
    rsvp: str | None

    model_config = {"from_attributes": True}


@router.get("/companies", response_model=list[CompanyResponse])
@authtoken
async def list_companies(
    current_user: User,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Company]:
    result = await db.execute(select(Company).order_by(Company.name))
    return list(result.scalars().all())


@router.get("/personal-colleagues", response_model=list[PersonalColleagueResponse])
@authtoken
async def list_personal_colleagues(
    current_user: User,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PersonalColleague]:
    result = await db.execute(select(PersonalColleague).order_by(PersonalColleague.full_name))
    return list(result.scalars().all())


@router.get("/personal-appointments", response_model=list[PersonalAppointmentResponse])
@authtoken
async def list_personal_appointments(
    current_user: User,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PersonalAppointment]:
    result = await db.execute(select(PersonalAppointment).order_by(PersonalAppointment.week_index, PersonalAppointment.day_index))
    return list(result.scalars().all())
