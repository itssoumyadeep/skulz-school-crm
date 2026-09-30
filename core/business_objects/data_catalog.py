from django.apps import apps


MODEL_CATEGORIES = {
    "Tenant": "Actors",
    "PortalRoleMembership": "Actors",
    "Student": "Actors",
    "Parent": "Actors",
    "EmergencyContact": "Actors",
    "Staff": "Actors",
    "Vendor": "Actors",
    "EventVolunteer": "Actors",
    "Application": "Processes",
    "Document": "Processes",
    "AuditLog": "Processes",
    "LessonPlan": "Processes",
    "Assignment": "Processes",
    "Exam": "Processes",
    "MarksRecord": "Processes",
    "ReportCard": "Processes",
    "StudentAttendance": "Processes",
    "StaffAttendance": "Processes",
    "LeaveRequest": "Processes",
    "AttendanceRoster": "Processes",
    "HealthObservation": "Processes",
    "MedicationLog": "Processes",
    "Incident": "Processes",
    "SafetyDrill": "Processes",
    "Invoice": "Processes",
    "Payment": "Processes",
    "DiscountWaiver": "Processes",
    "Reconciliation": "Processes",
    "Contract": "Processes",
    "PayrollRun": "Processes",
    "Appraisal": "Processes",
    "CPDRecord": "Processes",
    "Requisition": "Processes",
    "PurchaseOrder": "Processes",
    "DeliveryRecord": "Processes",
    "VendorInvoice": "Processes",
    "Event": "Processes",
    "EventRegistration": "Processes",
    "EventReport": "Processes",
    "Message": "Processes",
    "WebhookDeliveryAttempt": "Processes",
    "TenantSequence": "Meta Data",
    "Curriculum": "Meta Data",
    "AcademicCalendar": "Meta Data",
    "StudentHealth": "Meta Data",
    "FeeStructure": "Meta Data",
    "Inventory": "Meta Data",
    "AnalyticsSnapshot": "Meta Data",
    "CustomReport": "Meta Data",
    "ReportSchedule": "Meta Data",
    "WebhookSubscription": "Meta Data",
    "NotificationRule": "Meta Data",
}

CATEGORY_DESCRIPTIONS = {
    "Actors": "People, organizations, and role assignments that participate in school operations.",
    "Processes": "Workflow, transaction, communication, and outcome records.",
    "Meta Data": "Configuration, reference, schedule, and derived system records.",
}


def build_data_catalog():
    models = [
        model
        for model in apps.get_app_config("core").get_models()
        if not model._meta.abstract
    ]
    missing_categories = sorted(
        model.__name__
        for model in models
        if model.__name__ not in MODEL_CATEGORIES
    )
    if missing_categories:
        raise ValueError(
            f"Add classifications for core models: {', '.join(missing_categories)}"
        )

    elements = []
    for model in sorted(models, key=lambda item: item.__name__.lower()):
        fields = []
        for field in model._meta.fields:
            related_model = getattr(field, "related_model", None)
            fields.append(
                {
                    "name": field.name,
                    "label": str(field.verbose_name).title(),
                    "type": field.get_internal_type(),
                    "related_model": (
                        related_model.__name__ if related_model else None
                    ),
                    "required": not field.null and not field.blank and not field.primary_key,
                }
            )
        elements.append(
            {
                "name": model.__name__,
                "label": str(model._meta.verbose_name).title(),
                "table": model._meta.db_table,
                "category": MODEL_CATEGORIES[model.__name__],
                "fields": fields,
            }
        )

    counts = {
        category: sum(
            element["category"] == category for element in elements
        )
        for category in CATEGORY_DESCRIPTIONS
    }
    categories = [
        {
            "name": name,
            "description": description,
            "count": counts[name],
        }
        for name, description in CATEGORY_DESCRIPTIONS.items()
    ]
    return {"categories": categories, "elements": elements}