from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserSchool, School


@receiver(post_save, sender=User)
def create_user_school_for_new_user(sender, instance, created, **kwargs):
    """
    When a new user is created, automatically create UserSchool records
    for all active schools and set the first one as primary
    """
    if created:
        # Get all active schools
        active_schools = School.objects.filter(is_active=True)
        
        if active_schools.exists():
            # Create UserSchool for each active school
            for school in active_schools:
                # Check if UserSchool already exists
                if not UserSchool.objects.filter(user=instance, school=school).exists():
                    UserSchool.objects.create(
                        user=instance,
                        school=school,
                        is_primary=(school == active_schools.first()),
                        is_active=True
                    )
