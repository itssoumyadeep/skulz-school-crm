from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from core.models import PortalRoleMembership, Tenant


ROLE_GROUPS = (
    "Admin",
    "Principal",
    "Vice Principal",
    "Teacher",
    "Caregiver",
    "Parent",
    "Vendor",
    "Owner",
    "Board",
    "Trustee",
    "Staff",
)
DEVELOPMENT_PASSWORD = "1234"
ROLE_CODES = {
    "Admin": "Admin",
    "Principal": "Principal",
    "Vice Principal": "Vice_Principal",
    "Teacher": "Teacher",
    "Caregiver": "CareGiver",
    "Parent": "Parent",
    "Vendor": "Vendor",
    "Owner": "Owner",
    "Board": "Board",
    "Trustee": "Trustee",
    "Staff": "Staff",
}


class Command(BaseCommand):
    help = "Create development-only role groups and two sample users per group (password: 1234)."

    def handle(self, *args, **options):
        user_model = get_user_model()
        tenant, _ = Tenant.objects.get_or_create(
            subdomain="demo-school",
            defaults={
                "name": "The Purple Cubby Demo School",
                "type": "K-12",
                "subscription_tier": "Basic",
                "region": "Canada",
            },
        )
        created_users = 0

        for role_name in ROLE_GROUPS:
            group, _ = Group.objects.get_or_create(name=role_name)
            username_role = role_name.lower().replace(" ", "_")

            for index in (1, 2):
                username = f"{username_role}{index}"
                user, created = user_model.objects.get_or_create(
                    username=username,
                    defaults={
                        "first_name": role_name,
                        "last_name": str(index),
                        "email": f"{username}@demo-school.example.com",
                    },
                )
                user.first_name = role_name
                user.last_name = str(index)
                user.email = f"{username}@demo-school.example.com"
                user.set_password(DEVELOPMENT_PASSWORD)
                user.save()
                user.groups.add(group)
                PortalRoleMembership.objects.update_or_create(
                    user=user,
                    tenant=tenant,
                    defaults={
                        "group": group,
                        "role": ROLE_CODES[role_name],
                        "is_active": True,
                    },
                )
                created_users += int(created)

            self.stdout.write(
                self.style.SUCCESS(
                    f"{role_name}: {username_role}1, {username_role}2"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Ready: {len(ROLE_GROUPS)} groups, {len(ROLE_GROUPS) * 2} users "
                f"({created_users} newly created) for {tenant.name}. "
                f"Development password: {DEVELOPMENT_PASSWORD}"
            )
        )
