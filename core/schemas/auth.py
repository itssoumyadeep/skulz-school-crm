"""Pydantic schemas for login, signup, credentials, JWT payloads, and role authorization claims."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from core.business_objects.username import UsernameGenerationError, UsernameGeneratorBO


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
    first_name: Optional[str] = Field(default=None, max_length=150)
    last_name: Optional[str] = Field(default=None, max_length=150)
    full_name: Optional[str] = Field(default=None, max_length=150)
    email: EmailStr = Field(max_length=150)
    password: str = Field(min_length=10, max_length=128)
    tenant: str = Field(min_length=1, max_length=150)

    @model_validator(mode="after")
    def validate_and_normalize_names(self):
        first = (self.first_name or "").strip()
        last = (self.last_name or "").strip()
        full = (self.full_name or "").strip()

        if first and last:
            resolved_first, resolved_last = first, last
        elif full:
            try:
                resolved_first, resolved_last = UsernameGeneratorBO.split_full_name(full)
            except UsernameGenerationError as exc:
                raise ValueError(exc.message) from exc
        else:
            raise ValueError("First name and last name are required.")

        try:
            UsernameGeneratorBO.extract_initial(resolved_first, "first_name")
            UsernameGeneratorBO.extract_initial(resolved_last, "last_name")
        except UsernameGenerationError as exc:
            raise ValueError(exc.message) from exc

        self.first_name = resolved_first
        self.last_name = resolved_last
        return self


class TrialSignupSchema(BaseModel):
    daycare_name: str = Field(min_length=2, max_length=255)
    first_name: str = Field(min_length=1, max_length=150)
    last_name: str = Field(min_length=1, max_length=150)
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

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_contain_letter(cls, value: str, info) -> str:
        value = value.strip()
        if not value:
            field_label = info.field_name.replace("_", " ").title()
            raise ValueError(f"{field_label} is required.")
        try:
            UsernameGeneratorBO.extract_initial(value, info.field_name)
        except UsernameGenerationError as exc:
            raise ValueError(exc.message) from exc
        return value

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirmation do not match.")
        return self


class ProfilePictureUpdateSchema(BaseModel):
    avatar_url: Optional[str] = Field(default=None, max_length=5242880)

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

