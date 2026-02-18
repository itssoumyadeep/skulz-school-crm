from django.db import migrations

def add_subscription_to_default_school(apps, schema_editor):
    """Ensure default school has an active subscription"""
    School = apps.get_model('skucore', 'School')
    Subscription = apps.get_model('skucore', 'Subscription')
    
    try:
        school = School.objects.get(name='Default School')
        # Check if subscription exists
        try:
            sub = school.subscription
            # Update status to active if not already
            if sub.status != 'active':
                sub.status = 'active'
                sub.save()
        except Subscription.DoesNotExist:
            # Create subscription
            Subscription.objects.create(
                school=school,
                plan='pro',
                status='active',
                max_students=1000,
                max_users=50
            )
    except School.DoesNotExist:
        pass  # School doesn't exist yet, will be created by other migration

class Migration(migrations.Migration):

    dependencies = [
        ('skucore', '0009_create_default_school'),
    ]

    operations = [
        migrations.RunPython(add_subscription_to_default_school),
    ]
