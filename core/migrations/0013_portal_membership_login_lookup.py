from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0012_portalrolemembership_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                DROP POLICY IF EXISTS tenant_isolation_policy
                    ON core_portal_role_membership;
                CREATE POLICY tenant_isolation_policy
                    ON core_portal_role_membership
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
                CREATE POLICY portal_membership_self_read
                    ON core_portal_role_membership
                    FOR SELECT
                    USING (
                        user_id::text = NULLIF(
                            current_setting('app.current_user_id', true), ''
                        )
                    );
            """,
            reverse_sql="""
                DROP POLICY IF EXISTS portal_membership_self_read
                    ON core_portal_role_membership;
                DROP POLICY IF EXISTS tenant_isolation_policy
                    ON core_portal_role_membership;
                CREATE POLICY tenant_isolation_policy
                    ON core_portal_role_membership
                    USING (
                        tenant_id = NULLIF(
                            current_setting('app.current_tenant_id', true), ''
                        )::uuid
                    );
            """,
        ),
    ]