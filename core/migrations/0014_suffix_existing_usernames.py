import hashlib

from django.conf import settings
from django.db import migrations


def _with_school_suffix(username, school_code):
    suffix = f"_{school_code}"
    max_prefix_length = 150 - len(suffix)
    if len(username) > max_prefix_length:
        digest = hashlib.sha256(username.encode()).hexdigest()[:8]
        prefix_length = max_prefix_length - len(digest) - 1
        username = f"{username[:prefix_length]}_{digest}"
    return f"{username}{suffix}"


def suffix_single_school_usernames(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    Membership = apps.get_model("core", "PortalRoleMembership")
    Tenant = apps.get_model("core", "Tenant")
    database = schema_editor.connection.alias

    memberships = {}
    for user_id, tenant_id in Membership.objects.using(database).values_list(
        "user_id", "tenant_id"
    ):
        memberships.setdefault(user_id, set()).add(tenant_id)

    changes = []
    changed_user_ids = set()
    for user in User.objects.using(database).all().iterator():
        tenant_ids = memberships.get(user.pk, set())
        if len(tenant_ids) != 1:
            continue
        tenant = Tenant.objects.using(database).get(pk=next(iter(tenant_ids)))
        school_code = tenant.subdomain
        if user.username.lower().endswith(f"_{school_code}".lower()):
            continue
        changes.append(
            (user.pk, user.username, _with_school_suffix(user.username, school_code))
        )
        changed_user_ids.add(user.pk)

    reserved_usernames = {
        username.lower()
        for user_id, username in User.objects.using(database).values_list("pk", "username")
        if user_id not in changed_user_ids
    }
    for user_id, old_username, target_username in changes:
        candidate = target_username
        if candidate.lower() in reserved_usernames:
            suffix = target_username[target_username.rfind("_"):]
            digest = hashlib.sha256(f"{old_username}:{user_id}".encode()).hexdigest()[:8]
            prefix = old_username[: 150 - len(suffix) - len(digest) - 1]
            candidate = f"{prefix}_{digest}{suffix}"
        User.objects.using(database).filter(pk=user_id).update(username=candidate)
        reserved_usernames.add(candidate.lower())


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0013_portal_membership_login_lookup"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(suffix_single_school_usernames, migrations.RunPython.noop),
    ]
