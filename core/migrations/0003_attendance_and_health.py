# Generated for The Purple Cubby Sprint 3 Attendance, Rostering & Health/Safety
import uuid
import django.db.models.deletion
from django.db import migrations, models
from core.migrations.utils.rls import apply_rls_to_table, drop_rls_from_table


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_academic_domain'),
    ]

    operations = [
        migrations.CreateModel(
            name='StudentAttendance',
            fields=[
                ('att_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('class_id', models.UUIDField()),
                ('date', models.DateField()),
                ('period', models.CharField(default='Full_Day', max_length=50)),
                ('status', models.CharField(choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late'), ('Excused', 'Excused')], max_length=50)),
                ('method', models.CharField(choices=[('Manual', 'Manual'), ('QR', 'QR'), ('Biometric', 'Biometric'), ('Web', 'Web')], default='Manual', max_length=50)),
                ('marked_by', models.UUIDField()),
                ('notified_parent', models.BooleanField(default=False)),
                ('locked', models.BooleanField(default=False)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendances', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_student_attendance',
            },
        ),
        migrations.AddConstraint(
            model_name='studentattendance',
            constraint=models.UniqueConstraint(fields=('tenant', 'student', 'class_id', 'date', 'period'), name='uq_student_attendance_record'),
        ),
        migrations.AddConstraint(
            model_name='studentattendance',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Present', 'Absent', 'Late', 'Excused'])), name='chk_student_attendance_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_student_attendance'),
            reverse_sql=drop_rls_from_table('core_student_attendance')
        ),
        migrations.CreateModel(
            name='StaffAttendance',
            fields=[
                ('staff_att_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('staff_id', models.UUIDField()),
                ('date', models.DateField()),
                ('check_in', models.CharField(blank=True, max_length=10)),
                ('check_out', models.CharField(blank=True, max_length=10)),
                ('method', models.CharField(default='Manual', max_length=50)),
                ('status', models.CharField(choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late'), ('Half_Day', 'Half Day'), ('On_Leave', 'On Leave')], default='Present', max_length=50)),
                ('substitute_id', models.UUIDField(blank=True, null=True)),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('geofence_verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_staff_attendance',
            },
        ),
        migrations.AddConstraint(
            model_name='staffattendance',
            constraint=models.UniqueConstraint(fields=('tenant', 'staff_id', 'date'), name='uq_staff_attendance_record'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_staff_attendance'),
            reverse_sql=drop_rls_from_table('core_staff_attendance')
        ),
        migrations.CreateModel(
            name='LeaveRequest',
            fields=[
                ('leave_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('requester_id', models.UUIDField()),
                ('requester_type', models.CharField(choices=[('Student', 'Student'), ('Staff', 'Staff')], max_length=50)),
                ('leave_type', models.CharField(choices=[('Sick', 'Sick'), ('Casual', 'Casual'), ('Annual', 'Annual'), ('Unpaid', 'Unpaid'), ('Emergency', 'Emergency')], default='Sick', max_length=50)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('days', models.DecimalField(decimal_places=1, default=1.0, max_digits=4)),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected'), ('Cancelled', 'Cancelled')], default='Pending', max_length=50)),
                ('approved_by', models.UUIDField(blank=True, null=True)),
                ('approval_date', models.DateTimeField(blank=True, null=True)),
                ('balance_before', models.DecimalField(decimal_places=1, default=0.0, max_digits=5)),
                ('balance_after', models.DecimalField(decimal_places=1, default=0.0, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_leave_request',
            },
        ),
        migrations.AddConstraint(
            model_name='leaverequest',
            constraint=models.CheckConstraint(check=models.Q(('end_date__gte', models.F('start_date'))), name='chk_leave_end_date_gte_start_date'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_leave_request'),
            reverse_sql=drop_rls_from_table('core_leave_request')
        ),
        migrations.CreateModel(
            name='AttendanceRoster',
            fields=[
                ('roster_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('class_id', models.UUIDField()),
                ('date', models.DateField()),
                ('window_start', models.CharField(default='08:00', max_length=10)),
                ('window_end', models.CharField(default='10:00', max_length=10)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_attendance_roster',
            },
        ),
        migrations.AddConstraint(
            model_name='attendanceroster',
            constraint=models.UniqueConstraint(fields=('tenant', 'class_id', 'date'), name='uq_attendance_roster_class_date'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_attendance_roster'),
            reverse_sql=drop_rls_from_table('core_attendance_roster')
        ),
        migrations.CreateModel(
            name='StudentHealth',
            fields=[
                ('health_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('allergies', models.JSONField(blank=True, default=list)),
                ('conditions', models.JSONField(blank=True, default=list)),
                ('medications', models.JSONField(blank=True, default=list)),
                ('vaccinations', models.JSONField(blank=True, default=list)),
                ('doctor_name', models.CharField(blank=True, max_length=255)),
                ('doctor_phone', models.CharField(blank=True, max_length=50)),
                ('consent_flag', models.BooleanField(default=False)),
                ('consent_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='health_profile', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_student_health',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_student_health'),
            reverse_sql=drop_rls_from_table('core_student_health')
        ),
        migrations.CreateModel(
            name='HealthObservation',
            fields=[
                ('obs_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('staff_id', models.UUIDField()),
                ('date', models.DateField()),
                ('mood', models.CharField(default='Happy', max_length=50)),
                ('appetite', models.CharField(default='Good', max_length=50)),
                ('nap_duration_mins', models.PositiveIntegerField(default=0)),
                ('feeding_notes', models.TextField(blank=True)),
                ('general_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='health_observations', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_health_observation',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_health_observation'),
            reverse_sql=drop_rls_from_table('core_health_observation')
        ),
        migrations.CreateModel(
            name='MedicationLog',
            fields=[
                ('med_log_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('staff_id', models.UUIDField()),
                ('medicine_name', models.CharField(max_length=255)),
                ('dose', models.CharField(max_length=100)),
                ('time_administered', models.DateTimeField()),
                ('parent_notified', models.BooleanField(default=False)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='medication_logs', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_medication_log',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_medication_log'),
            reverse_sql=drop_rls_from_table('core_medication_log')
        ),
        migrations.CreateModel(
            name='Incident',
            fields=[
                ('incident_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('incident_type', models.CharField(choices=[('Injury', 'Injury'), ('Allergic_Reaction', 'Allergic Reaction'), ('Behavioral', 'Behavioral'), ('Safeguarding', 'Safeguarding'), ('Facility', 'Facility')], max_length=50)),
                ('severity', models.CharField(choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High'), ('Critical', 'Critical')], default='Low', max_length=50)),
                ('date', models.DateField()),
                ('time', models.CharField(default='12:00', max_length=10)),
                ('location', models.CharField(max_length=255)),
                ('students', models.JSONField(blank=True, default=list)),
                ('staff', models.JSONField(blank=True, default=list)),
                ('description', models.TextField()),
                ('actions_taken', models.TextField()),
                ('acknowledged_by', models.UUIDField(blank=True, null=True)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('escalated_to_principal', models.BooleanField(default=False)),
                ('parent_notified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_incident',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_incident'),
            reverse_sql=drop_rls_from_table('core_incident')
        ),
        migrations.CreateModel(
            name='SafetyDrill',
            fields=[
                ('drill_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('drill_type', models.CharField(choices=[('Fire', 'Fire'), ('Lockdown', 'Lockdown'), ('Earthquake', 'Earthquake'), ('Severe_Weather', 'Severe Weather')], max_length=50)),
                ('scheduled_date', models.DateField()),
                ('duration_seconds', models.PositiveIntegerField(default=120)),
                ('participation_rate', models.DecimalField(decimal_places=2, default=100.0, max_digits=5)),
                ('issues_noted', models.JSONField(blank=True, default=list)),
                ('completed_by', models.UUIDField()),
                ('signed_off', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_safety_drill',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_safety_drill'),
            reverse_sql=drop_rls_from_table('core_safety_drill')
        ),
    ]
