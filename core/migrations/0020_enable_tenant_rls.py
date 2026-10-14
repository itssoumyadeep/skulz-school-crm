from django.db import migrations


TENANT_TABLES = (
    "core_portal_role_membership",
    "core_tenant_sequence",
    "core_student",
    "core_application",
    "core_parent",
    "core_emergency_contact",
    "core_document",
    "core_audit_log",
    "core_curriculum",
    "core_academic_calendar",
    "core_lesson_plan",
    "core_assignment",
    "core_exam",
    "core_marks_record",
    "core_report_card",
    "core_student_attendance",
    "core_staff_attendance",
    "core_leave_request",
    "core_attendance_roster",
    "core_student_health",
    "core_health_observation",
    "core_medication_log",
    "core_incident",
    "core_safety_drill",
    "core_fee_structure",
    "core_invoice",
    "core_payment",
    "core_discount_waiver",
    "core_reconciliation",
    "core_staff",
    "core_contract",
    "core_payroll_run",
    "core_appraisal",
    "core_cpd_record",
    "core_vendor",
    "core_requisition",
    "core_purchase_order",
    "core_delivery_record",
    "core_vendor_invoice",
    "core_inventory",
    "core_analytics_snapshot",
    "core_custom_report",
    "core_report_schedule",
    "core_webhook_subscription",
    "core_webhook_delivery_attempt",
    "core_event",
    "core_event_registration",
    "core_event_volunteer",
    "core_event_report",
    "core_message",
    "core_notification_rule",
)


def _enable_rls(table_name: str) -> str:
    return f"""
        ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
        CREATE POLICY tenant_isolation_policy
            ON {table_name}
            FOR ALL
            USING (
                tenant_id = NULLIF(
                    current_setting('app.current_tenant_id', true), ''
                )::uuid
            )
            WITH CHECK (
                tenant_id = NULLIF(
                    current_setting('app.current_tenant_id', true), ''
                )::uuid
            );
    """


def _disable_rls(table_name: str) -> str:
    return f"""
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
        ALTER TABLE {table_name} NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;
    """


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0019_payment_stripe_currency"),
    ]

    operations = [
        migrations.RunSQL(
            sql="\n".join(_enable_rls(table) for table in TENANT_TABLES),
            reverse_sql="\n".join(_disable_rls(table) for table in reversed(TENANT_TABLES)),
        ),
    ]
