from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


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
