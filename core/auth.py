"""Convenience re-exports for JWT bearer authentication and role-based access control decorators."""

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles

__all__ = ['JWTAuthBearer', 'require_roles']
