# telemed_platform/telemed_platform/asgi.py
"""
ASGI config for telemed_platform project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'telemed_platform.settings')

application = get_asgi_application()