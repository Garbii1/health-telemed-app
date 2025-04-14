from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    UserProfileView,
    HealthRecordViewSet,
    AppointmentViewSet,
    DoctorPatientListView,
    DoctorListView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'vitals', HealthRecordViewSet, basename='healthrecord')
router.register(r'appointments', AppointmentViewSet, basename='appointment')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # JWT Login
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # JWT Refresh

    # Profile
    path('profile/', UserProfileView.as_view(), name='user_profile'),

    # Doctors
    path('doctors/', DoctorListView.as_view(), name='doctor_list'), # List available doctors
    path('doctor/patients/', DoctorPatientListView.as_view(), name='doctor_patient_list'), # Doctor's patient list

    # ViewSet routes
    path('', include(router.urls)), # Includes /vitals/ and /appointments/

    # Example for consultation booking/recording (can be part of AppointmentViewSet)
    # POST /api/consultation/ might map to AppointmentViewSet create or a custom action
    # If 'consultation' implies starting a video call or just recording notes,
    # it might be better handled within AppointmentViewSet actions like 'complete'
]