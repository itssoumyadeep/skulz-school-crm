import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

@dataclass
class RuleViolation:
    rule_id: str
    message: str
    field: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "code": "RULE_VIOLATION",
            "rule": self.rule_id,
            "field": self.field,
            "message": self.message
        }


class BusinessRuleError(Exception):
    """Raised when one or more business rules are violated."""
    def __init__(self, violations: List[RuleViolation]):
        self.violations = violations
        super().__init__(str([v.to_dict() for v in violations]))


class BaseBusinessObject:
    """
    Base class for all 23 Business Objects in The Purple Cubby architecture.
    Enforces the 3-Layer separation by containing domain business logic,
    state machines, and calculated properties.
    """
    def enforce_rules(self) -> None:
        """
        Collect and execute all validate_BR_* methods in declaration order.
        Raises BusinessRuleError if any rule is violated.
        """
        violations: List[RuleViolation] = []
        for name in dir(self):
            if name.startswith('validate_BR_'):
                method = getattr(self, name)
                result = method()
                if result is not None:
                    if isinstance(result, list):
                        violations.extend(result)
                    else:
                        violations.append(result)

        if violations:
            logger.warning(
                "Business rule violations in %s: %s",
                self.__class__.__name__,
                [v.rule_id for v in violations]
            )
            raise BusinessRuleError(violations)

    def to_dict(self) -> Dict[str, Any]:
        raise NotImplementedError("Subclasses must implement to_dict()")

    def to_response(self, tenant_id: str = None, role: str = None) -> Dict[str, Any]:
        return {
            "data": self.to_dict(),
            "meta": {
                "tenant_id": str(tenant_id) if tenant_id else None,
                "role": role,
                "version": "v1"
            },
            "errors": None
        }
