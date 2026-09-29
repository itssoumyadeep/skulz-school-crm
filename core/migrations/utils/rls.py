def apply_rls_to_table(table_name: str) -> str:
    """Returns SQL to enable and force RLS on a table for the tenant_isolation_policy."""
    return f"""
        ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
        CREATE POLICY tenant_isolation_policy ON {table_name}
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    """

def drop_rls_from_table(table_name: str) -> str:
    """Returns SQL to revert RLS on a table."""
    return f"""
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
        ALTER TABLE {table_name} NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;
    """
