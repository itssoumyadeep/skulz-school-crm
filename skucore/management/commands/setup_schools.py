"""
Django management command to initialize multi-tenancy setup.
Run with: python manage.py setup_schools
"""

import os
import secrets
import string
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from skucore.models import School, Subscription, UserSchool, UserRole


class Command(BaseCommand):
    help = 'Initialize multi-tenancy setup with default school and admin user'

    def generate_secure_password(self, length=16):
        """Generate a secure random password"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(chars) for _ in range(length))

    def create_admin_user(self):
        """Create default admin user"""
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@skulz.local')
        admin_password = os.environ.get('ADMIN_PASSWORD')
        
        # If no password provided, generate one
        if not admin_password:
            admin_password = self.generate_secure_password()
            self.stdout.write(self.style.WARNING(f'⚠️  Generated password for admin user: {admin_password}'))
        
        try:
            user = User.objects.get(username=admin_username)
            self.stdout.write(f"✓ Admin user '{admin_username}' already exists")
            return user
        except User.DoesNotExist:
            pass
        
        user = User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password
        )
        self.stdout.write(self.style.SUCCESS(f'✓ Created admin user: {admin_username}'))
        self.stdout.write(f"  Temporary password: {admin_password}")
        return user

    def create_school(self):
        """Create or verify default school"""
        school = None
        
        # Try to find existing default school
        try:
            school = School.objects.get(code='DEFAULT')
            self.stdout.write(f"✓ School found by code: '{school.name}'")
        except School.DoesNotExist:
            try:
                school = School.objects.get(name='Default School')
                self.stdout.write(f"✓ School found by name: '{school.name}'")
            except School.DoesNotExist:
                pass

        # Verify or fix subscription if school exists
        if school:
            try:
                sub = school.subscription
                self.stdout.write(f"  Subscription status: {sub.status}")
                if sub.status != 'active':
                    self.stdout.write("  Updating subscription status to active...")
                    sub.status = 'active'
                    sub.save()
                    self.stdout.write(self.style.SUCCESS("  ✓ Subscription updated to active"))
            except Exception as e:
                self.stdout.write("  School has no subscription, creating one...")
                Subscription.objects.create(
                    school=school,
                    plan='pro',
                    status='active',
                    max_students=1000,
                    max_users=50
                )
                self.stdout.write(self.style.SUCCESS("  ✓ Created subscription for existing school"))
            
            return school

        # Create new school if none exists
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
        self.stdout.write(self.style.SUCCESS(f'✓ Created default school: {school.name}'))

        # Create subscription
        Subscription.objects.create(
            school=school,
            plan='pro',
            status='active',
            max_students=1000,
            max_users=50
        )
        self.stdout.write(self.style.SUCCESS(f'✓ Created subscription for {school.name}'))
        
        return school

    def setup_admin_users(self, school):
        """Assign superusers to school"""
        superusers = User.objects.filter(is_superuser=True)
        self.stdout.write(f"Found {superusers.count()} superuser(s)")
        
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
                self.stdout.write(f"✓ {status.capitalize()} user '{user.username}' to school")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"ERROR setting up user: {e}"))

    def verify_setup(self):
        """Verify setup was successful"""
        self.stdout.write("\n" + "="*70)
        self.stdout.write("VERIFICATION")
        self.stdout.write("="*70)
        
        all_schools = School.objects.all()
        self.stdout.write(f"\nTotal schools in DB: {all_schools.count()}")
        for school in all_schools:
            self.stdout.write(f"  • {school.name} - Active: {school.is_active}")
            try:
                sub = school.subscription
                self.stdout.write(f"    Subscription: {sub.get_status_display()}")
            except:
                self.stdout.write(self.style.ERROR("    Subscription: NOT FOUND ❌"))
        
        active_schools = School.objects.filter(subscription__status='active')
        self.stdout.write(f"\nSchools with ACTIVE subscriptions: {active_schools.count()}")
        for school in active_schools:
            self.stdout.write(f"  • {school.name}")
        
        if active_schools.count() == 0:
            self.stdout.write(self.style.ERROR("\n⚠️  WARNING: No schools with active subscriptions!"))

    def handle(self, *args, **options):
        log_file = '/tmp/setup_schools.log'
        
        with open(log_file, 'w') as f:
            f.write("="*70 + "\n")
            f.write("SKULZ Multi-Tenancy Setup\n")
            f.write("="*70 + "\n\n")
            
            try:
                f.write("Setting up admin user...\n")
                self.stdout.write("Setting up admin user...")
                admin_user = self.create_admin_user()
                f.write(f"Admin user result: {admin_user}\n")
                
                f.write("\nSetting up school...\n")
                self.stdout.write("\nSetting up school...")
                school = self.create_school()
                f.write(f"School result: {school}\n")
                f.write(f"School ID: {school.id}\n")
                f.write(f"School is_active: {school.is_active}\n")
                
                # Verify subscription
                try:
                    sub = school.subscription
                    f.write(f"Subscription status: {sub.status}\n")
                    f.write(f"Subscription plan: {sub.plan}\n")
                except Exception as e:
                    f.write(f"ERROR getting subscription: {e}\n")
                
                f.write("\nSetting up admin users...\n")
                self.stdout.write("\nSetting up admin users...")
                self.setup_admin_users(school)
                f.write("Admin users setup complete\n")
                
                f.write("\nVerifying setup...\n")
                self.verify_setup()
                
                # Double-check the database
                f.write("\n" + "="*70 + "\n")
                f.write("DATABASE CHECK\n")
                f.write("="*70 + "\n")
                
                from skucore.models import School, Subscription
                all_schools = School.objects.all()
                f.write(f"\nTotal schools in DB: {all_schools.count()}\n")
                for s in all_schools:
                    f.write(f"  • {s.name} (id={s.id}, active={s.is_active})\n")
                    try:
                        sub = s.subscription
                        f.write(f"    Subscription: status={sub.status}, plan={sub.plan}\n")
                    except Exception as e:
                        f.write(f"    ERROR: {e}\n")
                
                active_schools = School.objects.filter(subscription__status='active')
                f.write(f"\nSchools with ACTIVE subscriptions: {active_schools.count()}\n")
                for s in active_schools:
                    f.write(f"  • {s.name}\n")
                
                f.write("\n" + "="*70 + "\n")
                f.write("✓ Multi-tenancy setup complete!\n")
                f.write("="*70 + "\n")
                
                self.stdout.write("\n" + "="*70)
                self.stdout.write(self.style.SUCCESS("✓ Multi-tenancy setup complete!"))
                self.stdout.write("="*70)
                self.stdout.write(f"\nLog written to: {log_file}")
                
            except Exception as e:
                f.write(f"\n❌ FATAL ERROR: {e}\n")
                import traceback
                f.write(traceback.format_exc())
                f.write("\n")
                
                self.stdout.write(self.style.ERROR(f"\n❌ FATAL ERROR: {e}"))
                import traceback
                traceback.print_exc()
                raise
