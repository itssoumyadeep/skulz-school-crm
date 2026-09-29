from .enrollments import router as enrollments_router
from .academics import router as academics_router
from .attendance import router as attendance_router
from .health import router as health_router

__all__ = [
    'enrollments_router',
    'academics_router',
    'attendance_router',
    'health_router'
]
