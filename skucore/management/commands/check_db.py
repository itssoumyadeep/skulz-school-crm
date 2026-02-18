"""
Diagnostic command to check database configuration and data
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
from skucore.models import School, Subscription, Student, Parent


class Command(BaseCommand):
    help = 'Diagnose database configuration and check data'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*70)
        self.stdout.write("DATABASE DIAGNOSTIC REPORT")
        self.stdout.write("="*70 + "\n")
        
        # Database Config
        self.stdout.write(self.style.HTTP_INFO("📊 DATABASE CONFIGURATION"))
        self.stdout.write("-" * 70)
        
        db_engine = settings.DATABASES['default']['ENGINE']
        self.stdout.write(f"Engine: {db_engine}")
        
        if 'postgresql' in db_engine.lower():
            db_name = settings.DATABASES['default'].get('NAME', 'N/A')
            db_host = settings.DATABASES['default'].get('HOST', 'N/A')
            db_port = settings.DATABASES['default'].get('PORT', 'N/A')
            self.stdout.write(f"Database: {db_name}")
            self.stdout.write(f"Host: {db_host}")
            self.stdout.write(f"Port: {db_port}")
        elif 'sqlite' in db_engine.lower():
            db_name = settings.DATABASES['default'].get('NAME', 'N/A')
            self.stdout.write(f"SQLite Database: {db_name}")
        
        # Test connection
        self.stdout.write("\n" + self.style.HTTP_INFO("🔗 DATABASE CONNECTION"))
        self.stdout.write("-" * 70)
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                self.stdout.write(self.style.SUCCESS("✓ Database connection: OK"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Database connection FAILED: {e}"))
            return
        
        # Check tables
        self.stdout.write("\n" + self.style.HTTP_INFO("📋 DATABASE TABLES"))
        self.stdout.write("-" * 70)
        
        try:
            with connection.cursor() as cursor:
                if 'postgresql' in db_engine.lower():
                    cursor.execute("""
                        SELECT table_name FROM information_schema.tables 
                        WHERE table_schema='public' 
                        ORDER BY table_name
                    """)
                else:  # SQLite
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                
                tables = cursor.fetchall()
                self.stdout.write(f"Total tables: {len(tables)}")
                for table in tables:
                    self.stdout.write(f"  • {table[0]}")
                
                # Check for critical tables
                critical_tables = ['skucore_school', 'skucore_subscription', 'auth_user']
                table_names = [t[0] for t in tables]
                
                self.stdout.write("\nCritical tables:")
                for table in critical_tables:
                    status = "✓" if table in table_names else "✗"
                    self.stdout.write(f"  {status} {table}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking tables: {e}"))
        
        # Check Schools
        self.stdout.write("\n" + self.style.HTTP_INFO("🏫 SCHOOLS"))
        self.stdout.write("-" * 70)
        
        try:
            schools = School.objects.all()
            self.stdout.write(f"Total schools: {schools.count()}")
            for school in schools:
                self.stdout.write(f"\n  School: {school.name} (ID: {school.id})")
                self.stdout.write(f"    Is Active: {school.is_active}")
                
                try:
                    sub = school.subscription
                    self.stdout.write(f"    Subscription Status: {sub.status}")
                    self.stdout.write(f"    Subscription Plan: {sub.plan}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    ✗ NO SUBSCRIPTION: {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error querying schools: {e}"))
        
        # Check Active Schools (used in login)
        self.stdout.write("\n" + self.style.HTTP_INFO("🔓 ACTIVE SCHOOLS (for login)"))
        self.stdout.write("-" * 70)
        
        try:
            active_schools = School.objects.filter(subscription__status='active')
            self.stdout.write(f"Schools with ACTIVE subscriptions: {active_schools.count()}")
            for school in active_schools:
                self.stdout.write(f"  • {school.name}")
            
            if active_schools.count() == 0:
                self.stdout.write(self.style.ERROR("\n⚠️  NO ACTIVE SCHOOLS FOUND!"))
                self.stdout.write("This is why the login page shows 'No Active Schools'")
                
                # Suggest fix
                schools_without_sub = School.objects.filter(subscription__isnull=True)
                if schools_without_sub.exists():
                    self.stdout.write("\nSchools without subscriptions:")
                    for school in schools_without_sub:
                        self.stdout.write(f"  • {school.name} (ID: {school.id})")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking active schools: {e}"))
        
        # Check Users
        self.stdout.write("\n" + self.style.HTTP_INFO("👤 USERS"))
        self.stdout.write("-" * 70)
        
        try:
            from django.contrib.auth.models import User
            users = User.objects.all()
            superusers = User.objects.filter(is_superuser=True)
            
            self.stdout.write(f"Total users: {users.count()}")
            self.stdout.write(f"Superusers: {superusers.count()}")
            
            for user in superusers:
                self.stdout.write(f"\n  Superuser: {user.username}")
                self.stdout.write(f"    Email: {user.email}")
                self.stdout.write(f"    Is Staff: {user.is_staff}")
                self.stdout.write(f"    Is Active: {user.is_active}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking users: {e}"))
        
        # Check Sample Data
        self.stdout.write("\n" + self.style.HTTP_INFO("📊 SAMPLE DATA COUNTS"))
        self.stdout.write("-" * 70)
        
        try:
            self.stdout.write(f"Students: {Student.objects.count()}")
            self.stdout.write(f"Parents: {Parent.objects.count()}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking data: {e}"))
        
        self.stdout.write("\n" + "="*70)
        self.stdout.write(self.style.SUCCESS("✓ Diagnostic report complete"))
        self.stdout.write("="*70 + "\n")
