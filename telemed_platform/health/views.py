# health/views.py
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q # For complex lookups (optional here)

from rest_framework import generics, permissions, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied # Import PermissionDenied

from .models import UserProfile, Appointment, HealthRecord, Role, DoctorProfile, PatientProfile
from .serializers import (
    RegisterSerializer, UserSerializer, UserProfileSerializer,
    AppointmentSerializer, HealthRecordSerializer, AppointmentListSerializer,
    DoctorPatientSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from .permissions import IsDoctor, IsPatient, IsOwnerOrDoctorReadOnly, IsPatientOwner, IsAppointmentParticipantOrReadOnly # Import custom permissions

# --- API Views ---

# Registration View
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,) # Anyone can register
    serializer_class = RegisterSerializer

# Login View (Using SimpleJWT's default view via urls.py)

# User Profile View (Get/Update current user's profile)
class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the profile for the currently authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        # Ensure the user has a profile, handle potential error if not
        # Use select_related to optimize fetching related user and profile details
        try:
            # Adjust related names if you changed them in models
            return UserProfile.objects.select_related(
                'user', 'doctor_details', 'patient_details'
            ).get(user=self.request.user)
        except UserProfile.DoesNotExist:
            # This case should ideally not happen if profile is created on user registration
            # Log this situation if it occurs
            print(f"Warning: UserProfile not found for user {self.request.user.id}, returning 404.")
            from django.http import Http404
            raise Http404("User profile not found.")

    def perform_update(self, serializer):
        # Ensure users can only update their own profiles
        # get_object already fetches the profile for the current user
        # You might add checks here if you allow updating nested 'user' fields
        # to prevent changing username or is_staff status etc.
        serializer.save()


# Health Record ViewSet
class HealthRecordViewSet(viewsets.ModelViewSet):
    """
    API endpoint for patients to manage their health records (vitals).
    - Patients can CRUD their own records.
    - Doctors can READ records of patients they have appointments with.
    """
    serializer_class = HealthRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'):
             return HealthRecord.objects.none() # No profile, no records

        if user.profile.role == Role.PATIENT:
            # Patients see only their own records, newest first
            return HealthRecord.objects.filter(patient=user).order_by('-record_time')
        elif user.profile.role == Role.DOCTOR:
            # Doctors see records of patients they have appointments with
            patient_ids = Appointment.objects.filter(doctor=user).values_list('patient_id', flat=True).distinct()
            return HealthRecord.objects.filter(patient_id__in=patient_ids).order_by('patient__username', '-record_time')
        return HealthRecord.objects.none()

    def perform_create(self, serializer):
        # Only allow patients to create records for themselves
        if self.request.user.profile.role == Role.PATIENT:
            serializer.save(patient=self.request.user)
        else:
            raise PermissionDenied("Only patients can submit health records.")

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'create':
            # Only authenticated patients can create
            self.permission_classes = [permissions.IsAuthenticated, IsPatient]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Only the patient owner can modify/delete their own record
            self.permission_classes = [permissions.IsAuthenticated, IsPatientOwner]
        elif self.action in ['list', 'retrieve']:
            # Authenticated patients (own) or associated doctors (read-only)
            # The get_queryset method handles the filtering logic.
            # IsOwnerOrDoctorReadOnly could be used for object-level 'retrieve' check
            self.permission_classes = [permissions.IsAuthenticated, IsOwnerOrDoctorReadOnly]
        else:
             # Default permissions for other actions if any
             self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()


# Appointment ViewSet
class AppointmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing appointments.
    - Patients can list their own appointments and create new ones.
    - Doctors can list their own appointments and update status/notes.
    - Both can cancel scheduled appointments they are part of.
    """
    permission_classes = [permissions.IsAuthenticated] # Base permission

    def get_serializer_class(self):
        if self.action == 'list':
            # Use a simpler serializer for list view for performance
            return AppointmentListSerializer
        # Use full serializer for create, retrieve, update etc.
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'):
            return Appointment.objects.none()

        # Prefetch related user details for efficiency
        base_queryset = Appointment.objects.select_related('patient__profile', 'doctor__profile')

        if user.profile.role == Role.PATIENT:
            # Patients see their appointments, ordered by time
            return base_queryset.filter(patient=user).order_by('-appointment_time')
        elif user.profile.role == Role.DOCTOR:
            # Doctors see their assigned appointments, ordered by time
            return base_queryset.filter(doctor=user).order_by('-appointment_time')
        return Appointment.objects.none()

    def perform_create(self, serializer):
        """
        Handle appointment creation.
        The serializer requires 'patient_id' and 'doctor_id'.
        We ensure the 'patient_id' matches the request user if they are a patient.
        """
        if self.request.user.profile.role == Role.PATIENT:
            # Check if patient_id in request data matches the logged-in user
            submitted_patient_id = self.request.data.get('patient_id')
            if submitted_patient_id and int(submitted_patient_id) != self.request.user.id:
                 raise PermissionDenied("Patients can only book appointments for themselves.")

            # Let the serializer handle validation and saving, it uses source='patient'
            # The serializer already validates doctor_id exists and is a doctor.
            # We pass the logged-in patient user to the save method, overriding patient_id if needed.
            serializer.save(patient=self.request.user, status=Appointment.StatusChoices.SCHEDULED)
            # Alternative if serializer requires patient_id explicitly and doesn't use source='patient':
            # serializer.save(patient_id=self.request.user.id, status=Appointment.StatusChoices.SCHEDULED)
        else:
            # Prevent non-patients (e.g., doctors trying to book for others via API)
            raise PermissionDenied("Only patients can book new appointments.")

    # Custom action for doctors to complete appointment and add notes
    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def complete(self, request, pk=null):
        appointment = self.get_object()
        # Ensure the doctor performing the action is the assigned doctor
        if appointment.doctor != request.user:
            return Response({'detail': 'Not authorized to complete this appointment.'}, status=status.HTTP_403_FORBIDDEN)

        # Only allow completing scheduled or potentially rescheduled appointments
        if appointment.status != Appointment.StatusChoices.SCHEDULED:
             return Response({'detail': f'Cannot complete an appointment with status {appointment.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('consultation_notes', '')
        # Basic validation for notes if needed
        if not notes:
            # Return error if notes are required for completion, or allow empty
            return Response({'consultation_notes': 'Consultation notes are required to complete the appointment.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.consultation_notes = notes
        appointment.status = Appointment.StatusChoices.COMPLETED
        appointment.save()
        # Use the detail serializer (AppointmentSerializer) for the response
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    # Custom action for cancelling
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated]) # Both can attempt cancel
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        # Check if the user is the patient or the doctor for this appointment
        if appointment.patient != request.user and appointment.doctor != request.user:
             return Response({'detail': 'Not authorized to cancel this appointment.'}, status=status.HTTP_403_FORBIDDEN)

        # Business logic: Only allow cancellation if appointment is SCHEDULED
        if appointment.status == Appointment.StatusChoices.SCHEDULED:
             appointment.status = Appointment.StatusChoices.CANCELLED
             appointment.save()
             serializer = self.get_serializer(appointment) # Use detail serializer
             return Response(serializer.data)
        else:
            # Provide informative error if already completed or cancelled
            return Response({'detail': f'Cannot cancel an appointment with status "{appointment.get_status_display()}".'}, status=status.HTTP_400_BAD_REQUEST)

    # Override default permissions for specific actions if needed (more granular than get_permissions)
    # def get_permissions(self):
    #     if self.action == 'create':
    #         self.permission_classes = [permissions.IsAuthenticated, IsPatient]
    #     elif self.action in ['update', 'partial_update', 'destroy']: # Default update/destroy might be restricted
    #         self.permission_classes = [permissions.IsAdminUser] # Example: Only admin can fully update/delete
    #     elif self.action == 'retrieve':
    #          self.permission_classes = [permissions.IsAuthenticated, IsAppointmentParticipantOrReadOnly]
    #     elif self.action == 'list':
    #          self.permission_classes = [permissions.IsAuthenticated] # Queryset handles filtering
    #     # Permissions for custom actions are set in @action decorator
    #     return super().get_permissions()

# Doctor's View of Assigned Patients
class DoctorPatientListView(generics.ListAPIView):
    """
    API endpoint for doctors to view a list of patients they have appointments with.
    """
    serializer_class = DoctorPatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor] # Only doctors

    def get_queryset(self):
        doctor = self.request.user
        # Get distinct patient IDs from appointments assigned to this doctor (any status)
        patient_ids = Appointment.objects.filter(doctor=doctor).values_list('patient_id', flat=True).distinct()
        # Return User objects for these patients, optimizing with profile details
        return User.objects.filter(
            id__in=patient_ids, profile__role=Role.PATIENT
        ).select_related('profile').order_by('first_name', 'last_name')

# View to get list of available doctors (for patients booking appointments)
class DoctorListView(generics.ListAPIView):
    """
    API endpoint for patients to get a list of available doctors to book appointments with.
    """
    # Use a specific serializer if you want to include doctor details like specialization
    serializer_class = UserSerializer # Or create DoctorListSerializer including profile/doctor_details
    permission_classes = [permissions.IsAuthenticated] # Any logged-in user can see doctors

    def get_queryset(self):
        # Return users who have a DoctorProfile, order by name
         # Optimize by selecting related profiles if serializer needs them
        return User.objects.filter(
            profile__role=Role.DOCTOR
        ).select_related('profile__doctor_details').order_by('first_name', 'last_name')