import uuid
import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class OrganizationCreate(BaseModel):
    name: str
    slug: str

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.lower().strip()
        if not re.match(r"^[a-z0-9][a-z0-9\-]{2,48}[a-z0-9]$", v):
            raise ValueError("Slug must be 4-50 chars, lowercase alphanumeric and hyphens only")
        return v


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization: OrganizationCreate

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: str
    org: str
    role: str
    exp: int


class RegisterResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
    token: Token
