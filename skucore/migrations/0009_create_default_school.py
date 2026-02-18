from django.db import migrations

def create_default_school(apps, schema_editor):
    School = apps.get_model('skucore', 'School')
    Subscription = apps.get_model('skucore', 'Subscription')
    
    if not School.objects.exists():
        school = School.objects.create(name="Default School")
        # Also create subscription with active status
        Subscription.objects.create(
            school=school,
            plan='pro',
            status='active',
            max_students=1000,
            max_users=50
        )

class Migration(migrations.Migration):

    dependencies = [
        ('skucore', '0008_assign_existing_data_to_default_school'),
    ]

    operations = [
        migrations.RunPython(create_default_school),
    ]
