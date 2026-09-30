from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_suffix_existing_usernames"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="studentattendance",
            name="chk_student_attendance_status_enum",
        ),
        migrations.AlterField(
            model_name="studentattendance",
            name="status",
            field=models.CharField(
                choices=[
                    ("Present", "Present"),
                    ("Absent", "Absent"),
                    ("Late", "Late"),
                    ("Excused", "Excused"),
                    ("On Leave", "On Leave"),
                    ("Holiday", "Holiday"),
                ],
                max_length=50,
            ),
        ),
        migrations.AddConstraint(
            model_name="studentattendance",
            constraint=models.CheckConstraint(
                check=models.Q(
                    status__in=[
                        "Present",
                        "Absent",
                        "Late",
                        "Excused",
                        "On Leave",
                        "Holiday",
                    ]
                ),
                name="chk_student_attendance_status_enum",
            ),
        ),
    ]