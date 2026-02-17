from django.apps import AppConfig


class SkucoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'skucore'    
    def ready(self):
        import skucore.signals