import pytest
from django.db import connection
from importlib import import_module

TENANT_TABLES = import_module(
    "core.migrations.0020_enable_tenant_rls"
).TENANT_TABLES


@pytest.mark.django_db
def test_all_tenant_tables_have_forced_rls_policy():
    if connection.vendor != "postgresql":
        pytest.skip("RLS catalog checks require PostgreSQL")

    table_names = set(TENANT_TABLES)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
            FROM pg_class AS c
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relname = ANY(%s)
            """,
            [list(table_names)],
        )
        table_security = {
            row[0]: {"enabled": row[1], "forced": row[2]}
            for row in cursor.fetchall()
        }
        cursor.execute(
            """
            SELECT DISTINCT tablename
            FROM pg_policies
            WHERE schemaname = current_schema()
              AND policyname = 'tenant_isolation_policy'
              AND tablename = ANY(%s)
            """,
            [list(table_names)],
        )
        policy_tables = {row[0] for row in cursor.fetchall()}

    assert table_names == set(table_security)
    assert all(
        security["enabled"] and security["forced"]
        for security in table_security.values()
    )
    assert policy_tables == table_names
