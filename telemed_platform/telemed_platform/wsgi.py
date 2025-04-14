# telemed_platform/telemed_platform/wsgi.py
"""
WSGI config for telemed_platform project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Point to the settings file
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'telemed_platform.settings')

application = get_wsgi_application()

# Note: This file will likely need modification for deployment on PythonAnywhere,
# as shown in the deployment instructions. This is the default version.