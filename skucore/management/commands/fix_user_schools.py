from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from skucore.models import School, UserSchool


class Command(BaseCommand):
    help = 'Create missing UserSchool records for existing users'

    def handle(self, *args, **options):
        # Get all active schools
        active_schools = School.objects.filter(is_active=True)
        
        if not active_schools.exists():
            self.stdout.write(self.style.WARNING('No active schools found.'))
            return
        
        # Get all users
        users = User.objects.all()
        
        fixed_count = 0
        
        for user in users:
            for school in active_schools:
                # Get or create UserSchool
                user_school, created = UserSchool.objects.get_or_create(
                    user=user,
                    school=school,
                    defaults={'is_active': True}
                )
                
                # If it exists but is inactive, activate it
                if not created and not user_school.is_active:
                    user_school.is_active = True
                    user_school.save()
                    fixed_count += 1
                
                if created:
                    fixed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created/fixed {fixed_count} UserSchool records'
            )
        )
