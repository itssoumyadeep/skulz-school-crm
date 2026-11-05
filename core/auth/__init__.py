"""Authentication package re-exports for JWT bearer verification and role-based access decorators."""

from .bearer import JWTAuthBearer
from .decorators import require_roles

__all__ = ['JWTAuthBearer', 'require_roles']
