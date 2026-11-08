"""Pydantic schemas for login, signup, credentials, JWT payloads, and role authorization claims."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


RoleChoice = Literal[
    "Admin",
    "Principal",
    "Vice_Principal",
    "Teacher",
    "CareGiver",
    "Parent",
    "Vendor",
    "Owner",
    "Board",
    "Trustee",
    "Staff",
]


class RoleMembershipCreateInput(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    user_id: Optional[int] = None
    role: RoleChoice
    is_active: bool = True


class RoleMembershipUpdateInput(BaseModel):
    role: Optional[RoleChoice] = None
    is_active: Optional[bool] = None


class LoginSchema(BaseModel):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1)


class SignupSchema(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr = Field(max_length=150)
    password: str = Field(min_length=10, max_length=128)
    tenant: str = Field(min_length=1, max_length=150)

    @field_validator("full_name")
    @classmethod
    def full_name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required.")
        return value


class TrialSignupSchema(BaseModel):
    daycare_name: str = Field(min_length=2, max_length=255)
    email: EmailStr = Field(max_length=150)
    role: Literal["Admin", "Teacher", "Owner"]
    password: str = Field(min_length=10, max_length=128)
    confirm_password: str = Field(min_length=10, max_length=128)

    @field_validator("daycare_name")
    @classmethod
    def daycare_name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Daycare center name is required.")
        return value

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirmation do not match.")
        return self


class ProfilePictureUpdateSchema(BaseModel):
    avatar_url: Optional[str] = Field(default=None, max_length=524288)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if (
            value.startswith("data:image/")
            or value.startswith("https://")
            or value.startswith("http://")
            or value.startswith("/")
        ):
            return value
        raise ValueError("Avatar must be a valid image data URI or URL.")

