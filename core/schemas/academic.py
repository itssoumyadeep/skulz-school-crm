from datetime import date
from typing import Optional, List, Dict, Any
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class CurriculumCreateSchema(BaseModel):
    grade: str
    version: str = "1.0"
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    learning_outcomes: List[str] = Field(default_factory=list)


class AcademicCalendarCreateSchema(BaseModel):
    academic_year: str  # e.g., "2025-2026"
    terms: List[Dict[str, Any]] = Field(default_factory=list)
    holidays: List[str] = Field(default_factory=list)  # ISO date strings
    exam_weeks: List[Dict[str, Any]] = Field(default_factory=list)
    blackout_dates: List[str] = Field(default_factory=list)


class LessonPlanCreateSchema(BaseModel):
    curriculum_id: UUID
    class_id: UUID
    week: int
    topic: str
    learning_outcomes: List[str] = Field(default_factory=list)

    @field_validator('week')
    @classmethod
    def week_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError('Week must be a positive integer')
        return v


class AssignmentCreateSchema(BaseModel):
    class_id: UUID
    subject: str
    title: str
    description: Optional[str] = ""
    due_date: date
    max_marks: Decimal = Decimal("100.00")

    @field_validator('max_marks')
    @classmethod
    def max_marks_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError('max_marks must be greater than 0')
        return v


class ExamCreateSchema(BaseModel):
    calendar_id: UUID
    class_id: UUID
    name: str
    exam_type: str = "Unit_Test"  # Unit_Test, Midterm, Final, Quiz
    date: date
    start_time: str = "09:00"
    end_time: str = "12:00"
    duration_mins: int = 180
    room: Optional[str] = ""
    max_marks: Decimal = Decimal("100.00")

    @field_validator('exam_type')
    @classmethod
    def valid_exam_type(cls, v: str) -> str:
        allowed = ['Unit_Test', 'Midterm', 'Final', 'Quiz']
        if v not in allowed:
            raise ValueError(f"exam_type must be one of {allowed}")
        return v


class MarksEntrySchema(BaseModel):
    student_id: UUID
    subject: str
    marks: Decimal
    max_marks: Decimal = Decimal("100.00")

    @field_validator('marks')
    @classmethod
    def marks_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError('Marks cannot be negative')
        return v

    def model_post_init(self, __context) -> None:
        if self.marks > self.max_marks:
            raise ValueError('marks cannot exceed max_marks')


class ReportCardGenerateSchema(BaseModel):
    calendar_id: UUID
    term: str
    year: int
    published_date: date
    attendance_percentage: Decimal = Decimal("100.00")
