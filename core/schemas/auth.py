from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginSchema(BaseModel):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1)
    tenant: str = Field(default="demo-school", min_length=1, max_length=150)


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
