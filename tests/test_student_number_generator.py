import pytest
from core.models import Tenant, generate_student_number, TenantSequence

@pytest.mark.django_db
class TestStudentNumberGenerator:
    def test_generates_sequential_ids_with_tenant_prefix(self, tenant_a):
        id_1 = generate_student_number(tenant_a, year=2026)
        id_2 = generate_student_number(tenant_a, year=2026)
        id_3 = generate_student_number(tenant_a, year=2026)

        assert id_1 == "OAK-2026-0001"
        assert id_2 == "OAK-2026-0002"
        assert id_3 == "OAK-2026-0003"

    def test_tenant_isolation_in_sequence_generation(self, tenant_a, tenant_b):
        id_a1 = generate_student_number(tenant_a, year=2026)
        id_b1 = generate_student_number(tenant_b, year=2026)
        id_a2 = generate_student_number(tenant_a, year=2026)

        assert id_a1 == "OAK-2026-0001"
        assert id_b1 == "MLA-2026-0001"
        assert id_a2 == "OAK-2026-0002"

    def test_default_prefix_when_config_omitted(self, db):
        import uuid
        tenant_no_prefix = Tenant.objects.create(
            tenant_id=uuid.uuid4(),
            name="Generic School",
            subdomain="generic",
            type="Private",
            config={}
        )
        id_val = generate_student_number(tenant_no_prefix, year=2026)
        assert id_val == "STU-2026-0001"

    def test_skips_student_number_already_used_when_sequence_lags(self, tenant_a):
        from datetime import date

        from core.models import Student

        Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0007",
            name="Existing Student",
            dob=date(2018, 1, 1),
            grade="Grade 1",
            status="Inactive",
        )
        TenantSequence.objects.create(
            tenant=tenant_a,
            sequence_type="STUDENT",
            year=2026,
            last_value=6,
        )

        assert generate_student_number(tenant_a, year=2026) == "OAK-2026-0008"
