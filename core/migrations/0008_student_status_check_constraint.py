from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_student_class_teacher_student_section'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE core_student DROP CONSTRAINT IF EXISTS chk_student_status_enum;
                ALTER TABLE core_student
                  ADD CONSTRAINT chk_student_status_enum
                  CHECK (
                    (status)::text = ANY (
                      ARRAY[
                        'Inquiry'::character varying,
                        'Applied'::character varying,
                        'Offered'::character varying,
                        'Accepted'::character varying,
                        'Active'::character varying,
                        'Waitlisted'::character varying,
                        'Rejected'::character varying,
                        'Withdrawn'::character varying
                      ]
                    )
                  );
            """,
            reverse_sql="""
                ALTER TABLE core_student DROP CONSTRAINT IF EXISTS chk_student_status_enum;
                ALTER TABLE core_student
                  ADD CONSTRAINT chk_student_status_enum
                  CHECK (
                    (status)::text = ANY (
                      ARRAY[
                        'Inquiry'::character varying,
                        'Applied'::character varying,
                        'Offered'::character varying,
                        'Active'::character varying,
                        'Withdrawn'::character varying
                      ]
                    )
                  );
            """,
        ),
    ]
