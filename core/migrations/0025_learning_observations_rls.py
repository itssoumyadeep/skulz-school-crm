from django.db import migrations

LEARNING_TENANT_TABLES = (
    "core_learning_framework",
    "core_learning_observation",
)


def _enable_rls_forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for table_name in LEARNING_TENANT_TABLES:
        schema_editor.execute(
            f"""
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
        )


def _disable_rls_reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for table_name in reversed(LEARNING_TENANT_TABLES):
        schema_editor.execute(
            f"""
            DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
            ALTER TABLE {table_name} NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;
            """
        )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0024_caregiver_tier2_learning_observations"),
    ]

    operations = [
        migrations.RunPython(_enable_rls_forward, reverse_code=_disable_rls_reverse),
    ]
