#!/usr/bin/env python
"""
Multi-tenancy initialization script.
Creates default school and sets up subscriptions for existing data.
Run after: python manage.py migrate
"""

import os
import django
import secrets
import string

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skubackend.settings')
django.setup()

from django.contrib.auth.models import User
from skucore.models import School, Subscription, UserSchool, UserRole


def generate_secure_password(length=16):
    """Generate a secure random password"""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))


def create_default_admin():
    """Create a default admin user"""
    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@skulz.local')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    
    # If no password provided, generate one
    if not admin_password:
        admin_password = generate_secure_password()
        print(f"⚠️  Generated password for admin user: {admin_password}")
    
    try:
        user = User.objects.get(username=admin_username)
        print(f"✓ Admin user '{admin_username}' already exists")
        return user
    except User.DoesNotExist:
        pass
    
    user = User.objects.create_superuser(
        username=admin_username,
        email=admin_email,
        password=admin_password
    )
    print(f"✓ Created admin user: {admin_username}")
    print(f"  Temporary password: {admin_password}")
    return user


def create_default_school():
    """Create a default school for existing data"""
    # Try to find existing default school by code or name
    school = None
    try:
        school = School.objects.get(code='DEFAULT')
        print(f"✓ School found by code: '{school.name}' (code: {school.code})")
    except School.DoesNotExist:
        try:
            school = School.objects.get(name='Default School')
            print(f"✓ School found by name: '{school.name}' (code: {school.code})")
        except School.DoesNotExist:
            pass
    
    # Verify or fix subscription if school exists
    if school:
        try:
            sub = school.subscription
            print(f"  Subscription status: {sub.status}")
            if sub.status != 'active':
                print(f"  Updating subscription status to active...")
                sub.status = 'active'
                sub.save()
                print(f"  ✓ Subscription updated to active")
        except Exception as e:
            print(f"  School has no subscription, creating one...")
            # Create subscription
            Subscription.objects.create(
                school=school,
                plan='pro',
                status='active',
                max_students=1000,
                max_users=50
            )
            print(f"  ✓ Created subscription for existing school")
        
        return school
    
    # Create new school if none exists
    try:
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
        print(f"✓ Created default school: {school.name} ({school.code})")
        
        # Create subscription
        Subscription.objects.create(
            school=school,
            plan='pro',
            status='active',
            max_students=1000,
            max_users=50
        )
        print(f"✓ Created subscription for {school.name}")
        
        return school
    except Exception as e:
        print(f"ERROR creating school and subscription: {e}")
        raise


def setup_admin_users(school):
    """Assign all superusers to the default school"""
    superusers = User.objects.filter(is_superuser=True)
    print(f"Found {superusers.count()} superuser(s)")
    
    for user in superusers:
        try:
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
            except UserRole.DoesNotExist:
                UserRole.objects.create(
                    user=user,
                    school=school,
                    role='admin',
                    is_active=True
                )
            
            status = "created" if created else "linked"
            print(f"✓ {status.capitalize()} user '{user.username}' to school '{school.name}'")
        except Exception as e:
            print(f"ERROR setting up user '{user.username}': {e}")


def verify_setup():
    """Verify that setup was successful"""
    print("\n" + "="*70)
    print("VERIFICATION")
    print("="*70)
    
    all_schools = School.objects.all()
    print(f"\nTotal schools in DB: {all_schools.count()}")
    for school in all_schools:
        print(f"  • {school.name} ({school.code}) - Active: {school.is_active}")
        try:
            sub = school.subscription
            print(f"    Subscription: {sub.get_status_display()} ({sub.get_plan_display()})")
        except:
            print(f"    Subscription: NOT FOUND ❌")
    
    active_schools = School.objects.filter(subscription__status='active')
    print(f"\nSchools with ACTIVE subscriptions: {active_schools.count()}")
    for school in active_schools:
        print(f"  • {school.name}")
    
    if active_schools.count() == 0:
        print("\n⚠️  WARNING: No schools with active subscriptions found!")
        print("   The login page will show 'No Active Schools'")


def main():
    print("\n" + "="*70)
    print("SKULZ Multi-Tenancy Setup")
    print("="*70 + "\n")
    
    try:
        # Create default admin user
        print("Setting up admin user...")
        admin_user = create_default_admin()
        
        # Create default school
        print("\nSetting up school...")
        school = create_default_school()
        
        # Setup admin users
        print("\nSetting up admin users...")
        setup_admin_users(school)
        
        # Verify
        verify_setup()
        
        print("\n" + "="*70)
        print("✓ Multi-tenancy setup complete!")
        print("="*70)
        print("\n🔐 LOGIN CREDENTIALS:")
        print(f"   School: Default School")
        print(f"   Username: {os.environ.get('ADMIN_USERNAME', 'admin')}")
        print(f"   Password: Check build output above (marked 'Temporary password')")
        print("\n📍 LOGIN URL:")
        print(f"   https://skulz-school-crm.onrender.com/login/")
        print("\n⚙️  ADMIN PANEL:")
        print(f"   https://skulz-school-crm.onrender.com/admin/")
        print("\n")
    except Exception as e:
        print(f"\n❌ FATAL ERROR during setup: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    main()
