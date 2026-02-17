#!/usr/bin/env python
"""
Multi-tenancy initialization script.
Creates default school and sets up subscriptions for existing data.
Run after: python manage.py migrate
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skubackend.settings')
django.setup()

from django.contrib.auth.models import User
from skucore.models import School, Subscription, UserSchool, UserRole


def create_default_school():
    """Create a default school for existing data"""
    try:
        school = School.objects.get(code='DEFAULT')
        print(f"✓ School '{school.name}' already exists")
        return school
    except School.DoesNotExist:
        pass
    
    school = School.objects.create(
        name='Default School',
        code='DEFAULT',
        email='admin@school.local',
        phone_number='+1-555-0000',
        street_address='123 School Street',
        city='Toronto',
        state='Ontario',
        postal_code='M1A 1A1',
        country='Canada',
        principal_name='John Principal',
        admin_email='principal@school.local',
        is_active=True
    )
    
    # Create subscription
    Subscription.objects.create(
        school=school,
        plan='pro',
        status='active',
        max_students=1000,
        max_users=50
    )
    
    print(f"✓ Created default school: {school.name} ({school.code})")
    return school


def setup_admin_users(school):
    """Assign all superusers to the default school"""
    superusers = User.objects.filter(is_superuser=True)
    
    for user in superusers:
        user_school, created = UserSchool.objects.get_or_create(
            user=user,
            school=school,
            defaults={'is_primary': True}
        )
        
        # Also create/update UserRole if needed
        try:
            user_role = user.user_role
            if user_role.school != school:
                user_role.school = school
                user_role.save()
        except:
            UserRole.objects.create(
                user=user,
                school=school,
                role='admin',
                is_active=True
            )
        
        status = "created" if created else "linked"
        print(f"✓ {status.capitalize()} user '{user.username}' to school '{school.name}'")


def main():
    print("\n" + "="*70)
    print("SKULZ Multi-Tenancy Setup")
    print("="*70 + "\n")
    
    # Create default school
    school = create_default_school()
    
    # Setup admin users
    print("\nSetting up admin users...")
    setup_admin_users(school)
    
    print("\n" + "="*70)
    print("✓ Multi-tenancy setup complete!")
    print("="*70)
    print("\nNext steps:")
    print("1. Go to http://127.0.0.1:8000/login/")
    print("2. Select 'Default School' from the dropdown")
    print("3. Enter your superuser credentials")
    print("4. Create additional schools in Django admin: /admin/")
    print("5. Add UserSchool records to link users to schools")
    print("\n")


if __name__ == '__main__':
    main()
