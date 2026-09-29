# Generated for The Purple Cubby Sprint 1 Foundation & Tenant Core
import uuid
import django.db.models.deletion
from django.db import migrations, models
from core.migrations.utils.rls import apply_rls_to_table, drop_rls_from_table


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('tenant_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('subdomain', models.CharField(db_index=True, max_length=100, unique=True)),
                ('type', models.CharField(max_length=50)),
                ('subscription_tier', models.CharField(choices=[('Basic', 'Basic'), ('Standard', 'Standard'), ('Enterprise', 'Enterprise')], default='Basic', max_length=50)),
                ('region', models.CharField(max_length=50)),
                ('config', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
            ],
            options={
                'db_table': 'core_tenant',
            },
        ),
        migrations.CreateModel(
            name='TenantSequence',
            fields=[
                ('sequence_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('sequence_type', models.CharField(default='STUDENT', max_length=50)),
                ('year', models.IntegerField(default=2026)),
                ('last_value', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_tenant_sequence',
            },
        ),
        migrations.AddConstraint(
            model_name='tenantsequence',
            constraint=models.UniqueConstraint(fields=('tenant', 'sequence_type', 'year'), name='uq_tenant_sequence_type_year'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_tenant_sequence'),
            reverse_sql=drop_rls_from_table('core_tenant_sequence')
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('student_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('student_number', models.CharField(db_index=True, max_length=50)),
                ('class_id', models.UUIDField(blank=True, null=True)),
                ('name', models.CharField(max_length=255)),
                ('dob', models.DateField()),
                ('grade', models.CharField(max_length=50)),
                ('status', models.CharField(choices=[('Inquiry', 'Inquiry'), ('Applied', 'Applied'), ('Offered', 'Offered'), ('Accepted', 'Accepted'), ('Active', 'Active'), ('Waitlisted', 'Waitlisted'), ('Rejected', 'Rejected'), ('Withdrawn', 'Withdrawn')], default='Inquiry', max_length=50)),
                ('enrolled_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_student',
            },
        ),
        migrations.AddConstraint(
            model_name='student',
            constraint=models.UniqueConstraint(fields=('tenant', 'student_number'), name='uq_student_tenant_student_number'),
        ),
        migrations.AddConstraint(
            model_name='student',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Inquiry', 'Applied', 'Offered', 'Accepted', 'Active', 'Waitlisted', 'Rejected', 'Withdrawn'])), name='chk_student_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_student'),
            reverse_sql=drop_rls_from_table('core_student')
        ),
        migrations.CreateModel(
            name='Application',
            fields=[
                ('application_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Under_Review', 'Under Review'), ('Offered', 'Offered'), ('Accepted', 'Accepted'), ('Rejected', 'Rejected'), ('Waitlisted', 'Waitlisted'), ('Active', 'Active')], default='Pending', max_length=50)),
                ('applied_date', models.DateTimeField(auto_now_add=True)),
                ('decision_date', models.DateTimeField(blank=True, null=True)),
                ('decided_by', models.UUIDField(blank=True, null=True)),
                ('payment_confirmed', models.BooleanField(default=False)),
                ('notification_dispatched', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='applications', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_application',
            },
        ),
        migrations.AddConstraint(
            model_name='application',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Pending', 'Under_Review', 'Offered', 'Accepted', 'Rejected', 'Waitlisted', 'Active'])), name='chk_application_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_application'),
            reverse_sql=drop_rls_from_table('core_application')
        ),
        migrations.CreateModel(
            name='Parent',
            fields=[
                ('parent_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('relationship', models.CharField(max_length=100)),
                ('phone', models.CharField(max_length=50)),
                ('email', models.EmailField(max_length=255)),
                ('notification_prefs', models.JSONField(blank=True, default=dict)),
                ('media_consent', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parents', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_parent',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_parent'),
            reverse_sql=drop_rls_from_table('core_parent')
        ),
        migrations.CreateModel(
            name='EmergencyContact',
            fields=[
                ('contact_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=50)),
                ('relationship', models.CharField(max_length=100)),
                ('medical_consent', models.BooleanField(default=False)),
                ('consent_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='emergency_contacts', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_emergency_contact',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_emergency_contact'),
            reverse_sql=drop_rls_from_table('core_emergency_contact')
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('document_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('doc_type', models.CharField(max_length=100)),
                ('file_path', models.CharField(max_length=512)),
                ('verified', models.BooleanField(default=False)),
                ('verified_by', models.UUIDField(blank=True, null=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='core.application')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_document',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_document'),
            reverse_sql=drop_rls_from_table('core_document')
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('log_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('actor_id', models.UUIDField(blank=True, null=True)),
                ('action', models.CharField(choices=[('CREATE', 'CREATE'), ('UPDATE', 'UPDATE'), ('DELETE', 'DELETE')], max_length=50)),
                ('entity', models.CharField(max_length=100)),
                ('entity_id', models.CharField(blank=True, max_length=100, null=True)),
                ('old_values', models.JSONField(blank=True, default=dict)),
                ('new_values', models.JSONField(blank=True, default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_audit_log',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_audit_log'),
            reverse_sql=drop_rls_from_table('core_audit_log')
        ),
    ]
