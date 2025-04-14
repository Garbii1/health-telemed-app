from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth.models import User
from .models import UserProfile, Appointment, HealthRecord, Role
from .serializers import (
    RegisterSerializer, UserSerializer, UserProfileSerializer,
    AppointmentSerializer, HealthRecordSerializer, AppointmentListSerializer,
    DoctorPatientSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from .permissions import IsDoctor, IsPatient, IsOwnerOrDoctorReadOnly # Custom permissions

# Custom Permissions (create health/permissions.py)
# health/permissions.py
from rest_framework import permissions
from .models import Role

class IsDoctor(permissions.BasePermission):
    """ Allows access only to users with Doctor role. """
    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == Role.DOCTOR

class IsPatient(permissions.BasePermission):
    """ Allows access only to users with Patient role. """
    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == Role.PATIENT

class IsOwnerOrDoctorReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object (Patient) to edit it.
    Allows Doctors associated via appointments to read it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user (simplification for now)
        # Or specifically check if doctor is associated? More complex.
        if request.method in permissions.SAFE_METHODS:
             # Allow read access if user is the patient OR a doctor who has an appointment with the patient
             if obj.patient == request.user:
                 return True
             if hasattr(request.user, 'profile') and request.user.profile.role == Role.DOCTOR:
                 # Check if this doctor has any appointment with this patient
                 return Appointment.objects.filter(doctor=request.user, patient=obj.patient).exists()
             return False # Or allow any doctor? Depends on requirements.

        # Write permissions are only allowed to the patient owner of the health record.
        return obj.patient == request.user


# --- API Views ---

# Registration View
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,) # Anyone can register
    serializer_class = RegisterSerializer

# Login View (using SimpleJWT's default view)
# We will configure this in urls.py

# User Profile View (Get current user's profile)
class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        # Ensure the user has a profile, handle potential error if not
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        if created:
            # Potentially log this or handle default role assignment if needed
            profile.role = Role.PATIENT # Default to Patient if created on the fly? Or require role at registration
            profile.save()
        return profile


# Health Record ViewSet (Patient submits vitals, Both can view based on permissions)
class HealthRecordViewSet(viewsets.ModelViewSet):
    serializer_class = HealthRecordSerializer
    permission_classes = [permissions.IsAuthenticated] # Base permission

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'):
             return HealthRecord.objects.none() # No profile, no records

        if user.profile.role == Role.PATIENT:
            # Patients see only their own records
            return HealthRecord.objects.filter(patient=user)
        elif user.profile.role == Role.DOCTOR:
            # Doctors see records of patients they have appointments with
            patient_ids = Appointment.objects.filter(doctor=user).values_list('patient_id', flat=True).distinct()
            return HealthRecord.objects.filter(patient_id__in=patient_ids)
        return HealthRecord.objects.none() # Should not happen for authenticated users with profiles

    def perform_create(self, serializer):
        # Only allow patients to create records for themselves
        if self.request.user.profile.role == Role.PATIENT:
            serializer.save(patient=self.request.user)
        else:
            # This should ideally be caught by permissions, but double-check
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only patients can submit health records.")

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - Patients can create/read/update/delete their own records.
        - Doctors can only read records of their patients.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Write actions restricted to Patients who own the record
             # For create, check role. For others, IsOwnerOrDoctorReadOnly handles it.
            if self.action == 'create':
                return [permissions.IsAuthenticated(), IsPatient()]
            else:
                # Apply IsOwner permission (adjust IsOwnerOrDoctorReadOnly or create IsOwner)
                # Let's refine IsOwnerOrDoctorReadOnly to work here
                # For now, let's be strict: only Patient owner can modify/delete
                 class IsPatientOwner(permissions.BasePermission):
                     def has_object_permission(self, request, view, obj):
                         return obj.patient == request.user and request.user.profile.role == Role.PATIENT
                 return [permissions.IsAuthenticated(), IsPatientOwner()]
        elif self.action in ['list', 'retrieve']:
            # Read actions allowed for Patients (own) and Doctors (their patients)
            return [permissions.IsAuthenticated()] # Queryset filtering handles visibility
        return super().get_permissions()


# Appointment ViewSet
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        # Use a simpler serializer for list view if defined
        if self.action == 'list':
            return AppointmentListSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'):
            return Appointment.objects.none()

        if user.profile.role == Role.PATIENT:
            # Patients see their appointments
            return Appointment.objects.filter(patient=user).order_by('-appointment_time')
        elif user.profile.role == Role.DOCTOR:
            # Doctors see their assigned appointments
            return Appointment.objects.filter(doctor=user).order_by('-appointment_time')
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # Patients book appointments
        if self.request.user.profile.role == Role.PATIENT:
            # Doctor ID must be provided in the request data
            doctor_id = self.request.data.get('doctor_id')
            if not doctor_id:
                raise serializers.ValidationError("Doctor ID must be provided to book an appointment.")
            try:
                doctor = User.objects.get(pk=doctor_id, profile__role=Role.DOCTOR)
            except User.DoesNotExist:
                 raise serializers.ValidationError("Invalid Doctor ID provided.")
            serializer.save(patient=self.request.user, doctor=doctor, status=Appointment.StatusChoices.SCHEDULED)
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only patients can book new appointments.")

    # Add custom actions for doctors (e.g., complete appointment, add notes)
    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        # Ensure the doctor performing the action is the assigned doctor
        if appointment.doctor != request.user:
            return Response({'detail': 'Not authorized to complete this appointment.'}, status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('consultation_notes', '')
        appointment.consultation_notes = notes
        appointment.status = Appointment.StatusChoices.COMPLETED
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated]) # Both can cancel? Or just patient? Let's allow both for now.
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        # Check if the user is the patient or the doctor for this appointment
        if appointment.patient != request.user and appointment.doctor != request.user:
             return Response({'detail': 'Not authorized to cancel this appointment.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status == Appointment.StatusChoices.SCHEDULED:
             appointment.status = Appointment.StatusChoices.CANCELLED
             appointment.save()
             serializer = self.get_serializer(appointment)
             return Response(serializer.data)
        else:
            return Response({'detail': 'Only scheduled appointments can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)


# Doctor's View of Assigned Patients
class DoctorPatientListView(generics.ListAPIView):
    serializer_class = DoctorPatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor] # Only doctors can access

    def get_queryset(self):
        doctor = self.request.user
        # Get distinct patient IDs from appointments assigned to this doctor
        patient_ids = Appointment.objects.filter(doctor=doctor).values_list('patient_id', flat=True).distinct()
        # Return User objects for these patients
        return User.objects.filter(id__in=patient_ids, profile__role=Role.PATIENT)

# View to get list of available doctors (for patients booking appointments)
class DoctorListView(generics.ListAPIView):
     serializer_class = UserSerializer # Or a specific DoctorListSerializer if needed
     permission_classes = [permissions.IsAuthenticated] # Only logged-in users can see doctors

     def get_queryset(self):
         # Return users who have a DoctorProfile
         return User.objects.filter(profile__role=Role.DOCTOR)