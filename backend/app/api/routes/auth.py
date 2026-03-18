from fastapi import APIRouter, Depends, HTTPException, status
import motor.motor_asyncio

from app.core.dependencies import get_db
from app.core.security import verify_password, create_access_token
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    repo = UserRepository(db)
    if await repo.get_by_email(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await repo.get_by_username(payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    user = await repo.create(payload.email, payload.username, payload.password)
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        created_at=user["created_at"],
        is_active=user["is_active"],
    )


@router.post("/login", response_model=Token)
async def login(
    payload: UserLogin,
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": str(user["_id"])})
    return Token(access_token=token)
