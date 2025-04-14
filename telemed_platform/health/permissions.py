# health/permissions.py
from rest_framework import permissions
from .models import Role, Appointment # Import Appointment if needed for checks

class IsDoctor(permissions.BasePermission):
    """
    Allows access only to authenticated users with the Doctor role.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated, has a profile, and role is Doctor
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == Role.DOCTOR
        )

class IsPatient(permissions.BasePermission):
    """
    Allows access only to authenticated users with the Patient role.
    """
    def has_permission(self, request, view):
         # Check if user is authenticated, has a profile, and role is Patient
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == Role.PATIENT
        )

class IsOwnerOrDoctorReadOnly(permissions.BasePermission):
    """
    Object-level permission:
    - Allows Patient owner to perform any action (including write).
    - Allows associated Doctors read-only access (SAFE_METHODS).
    """
    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) check
        if request.method in permissions.SAFE_METHODS:
            # Allow if user is the owner (patient)
            if obj.patient == request.user:
                return True
            # Allow if user is a doctor and has an appointment with this patient
            if IsDoctor().has_permission(request, view): # Reuse IsDoctor check
                 # Check if this doctor has any appointment with this patient (obj is HealthRecord)
                 return Appointment.objects.filter(doctor=request.user, patient=obj.patient).exists()
            return False # Deny read access otherwise

        # Write permissions (POST, PUT, PATCH, DELETE) are only allowed to the patient owner.
        # Ensure the owner is also a patient (redundant check but safe)
        return obj.patient == request.user and IsPatient().has_permission(request, view)

class IsPatientOwner(permissions.BasePermission):
    """
    Object-level permission to only allow the Patient owner of an object to modify/delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Works for HealthRecord (obj.patient) or Appointment (obj.patient)
        patient_field = getattr(obj, 'patient', None)
        if not patient_field:
             # If object doesn't have a 'patient' field directly, deny (or adapt logic)
             return False
        return patient_field == request.user and IsPatient().has_permission(request, view)

class IsAppointmentParticipantOrReadOnly(permissions.BasePermission):
    """
    Object-level permission for Appointments:
    - Allows read access to authenticated users.
    - Allows write/update access only to the Patient or Doctor involved.
    (Note: Specific actions like 'cancel', 'complete' have their own permission checks in the viewset actions)
    """
    def has_object_permission(self, request, view, obj):
        # SAFE_METHODS check (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            # Allow any authenticated user to view appointment details?
            # Or restrict to participants? Let's restrict for now.
             return request.user.is_authenticated and (obj.patient == request.user or obj.doctor == request.user)

        # Write permissions (PUT, PATCH, DELETE) - potentially restrict further based on action
        # Usually handled by specific actions, but this can be a base check.
        return obj.patient == request.user or obj.doctor == request.user