from django.db import migrations

def create_default_school(apps, schema_editor):
    School = apps.get_model('skucore', 'School')
    if not School.objects.exists():
        School.objects.create(name="Default School")

class Migration(migrations.Migration):

    dependencies = [
        ('skucore', '0008_assign_existing_data_to_default_school'),
    ]

    operations = [
        migrations.RunPython(create_default_school),
    ]
