# Generated for The Purple Cubby Sprint 2 Academic Management & Assessment
import uuid
import django.db.models.deletion
from django.db import migrations, models
from core.migrations.utils.rls import apply_rls_to_table, drop_rls_from_table


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Curriculum',
            fields=[
                ('curriculum_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('grade', models.CharField(max_length=50)),
                ('subjects', models.JSONField(blank=True, default=list)),
                ('learning_outcomes', models.JSONField(blank=True, default=list)),
                ('version', models.CharField(default='1.0', max_length=50)),
                ('approved_by', models.UUIDField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_curriculum',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_curriculum'),
            reverse_sql=drop_rls_from_table('core_curriculum')
        ),
        migrations.CreateModel(
            name='AcademicCalendar',
            fields=[
                ('calendar_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('academic_year', models.CharField(max_length=50)),
                ('terms', models.JSONField(blank=True, default=list)),
                ('holidays', models.JSONField(blank=True, default=list)),
                ('exam_weeks', models.JSONField(blank=True, default=list)),
                ('blackout_dates', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_academic_calendar',
            },
        ),
        migrations.AddConstraint(
            model_name='academiccalendar',
            constraint=models.UniqueConstraint(fields=('tenant', 'academic_year'), name='uq_calendar_tenant_academic_year'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_academic_calendar'),
            reverse_sql=drop_rls_from_table('core_academic_calendar')
        ),
        migrations.CreateModel(
            name='LessonPlan',
            fields=[
                ('plan_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('teacher_id', models.UUIDField()),
                ('class_id', models.UUIDField()),
                ('week', models.PositiveIntegerField()),
                ('topic', models.CharField(max_length=255)),
                ('learning_outcomes', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(choices=[('Draft', 'Draft'), ('Submitted', 'Submitted'), ('Approved', 'Approved'), ('Rejected', 'Rejected')], default='Draft', max_length=50)),
                ('reviewed_by', models.UUIDField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('curriculum', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_plans', to='core.curriculum')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_lesson_plan',
            },
        ),
        migrations.AddConstraint(
            model_name='lessonplan',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Draft', 'Submitted', 'Approved', 'Rejected'])), name='chk_lesson_plan_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_lesson_plan'),
            reverse_sql=drop_rls_from_table('core_lesson_plan')
        ),
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('assignment_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('teacher_id', models.UUIDField()),
                ('class_id', models.UUIDField()),
                ('subject', models.CharField(max_length=100)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('due_date', models.DateField()),
                ('max_marks', models.DecimalField(decimal_places=2, default=100.0, max_digits=5)),
                ('submission_tracking', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_assignment',
            },
        ),
        migrations.AddConstraint(
            model_name='assignment',
            constraint=models.CheckConstraint(check=models.Q(('max_marks__gt', 0)), name='chk_assignment_max_marks_positive'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_assignment'),
            reverse_sql=drop_rls_from_table('core_assignment')
        ),
        migrations.CreateModel(
            name='Exam',
            fields=[
                ('exam_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('class_id', models.UUIDField()),
                ('name', models.CharField(max_length=255)),
                ('exam_type', models.CharField(choices=[('Unit_Test', 'Unit Test'), ('Midterm', 'Midterm'), ('Final', 'Final'), ('Quiz', 'Quiz')], default='Unit_Test', max_length=50)),
                ('date', models.DateField()),
                ('start_time', models.CharField(default='09:00', max_length=10)),
                ('end_time', models.CharField(default='12:00', max_length=10)),
                ('duration_mins', models.PositiveIntegerField(default=180)),
                ('room', models.CharField(blank=True, max_length=100)),
                ('invigilator_id', models.UUIDField(blank=True, null=True)),
                ('max_marks', models.DecimalField(decimal_places=2, default=100.0, max_digits=5)),
                ('status', models.CharField(choices=[('Draft', 'Draft'), ('Scheduled', 'Scheduled'), ('Conducted', 'Conducted'), ('Published', 'Published')], default='Draft', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('calendar', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exams', to='core.academiccalendar')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_exam',
            },
        ),
        migrations.AddConstraint(
            model_name='exam',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Draft', 'Scheduled', 'Conducted', 'Published'])), name='chk_exam_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_exam'),
            reverse_sql=drop_rls_from_table('core_exam')
        ),
        migrations.CreateModel(
            name='MarksRecord',
            fields=[
                ('marks_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('teacher_id', models.UUIDField()),
                ('subject', models.CharField(max_length=100)),
                ('marks', models.DecimalField(decimal_places=2, max_digits=5)),
                ('max_marks', models.DecimalField(decimal_places=2, default=100.0, max_digits=5)),
                ('grade', models.CharField(blank=True, max_length=10)),
                ('locked', models.BooleanField(default=False)),
                ('moderated_by', models.UUIDField(blank=True, null=True)),
                ('moderation_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('exam', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='marks_records', to='core.exam')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='marks_records', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_marks_record',
            },
        ),
        migrations.AddConstraint(
            model_name='marksrecord',
            constraint=models.UniqueConstraint(fields=('tenant', 'student', 'exam', 'subject'), name='uq_marks_record_student_exam_subject'),
        ),
        migrations.AddConstraint(
            model_name='marksrecord',
            constraint=models.CheckConstraint(check=models.Q(('marks__gte', 0)), name='chk_marks_non_negative'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_marks_record'),
            reverse_sql=drop_rls_from_table('core_marks_record')
        ),
        migrations.CreateModel(
            name='ReportCard',
            fields=[
                ('report_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('term', models.CharField(max_length=50)),
                ('year', models.IntegerField(default=2026)),
                ('overall_grade', models.CharField(max_length=10)),
                ('gpa', models.DecimalField(decimal_places=2, default=0.0, max_digits=4)),
                ('subject_grades', models.JSONField(blank=True, default=list)),
                ('attendance_percentage', models.DecimalField(decimal_places=2, default=100.0, max_digits=5)),
                ('published_date', models.DateField()),
                ('is_published', models.BooleanField(default=False)),
                ('parent_ack', models.BooleanField(default=False)),
                ('parent_ack_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('calendar', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='report_cards', to='core.academiccalendar')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='report_cards', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_report_card',
            },
        ),
        migrations.AddConstraint(
            model_name='reportcard',
            constraint=models.UniqueConstraint(fields=('tenant', 'student', 'term', 'year'), name='uq_report_card_student_term_year'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_report_card'),
            reverse_sql=drop_rls_from_table('core_report_card')
        ),
    ]
