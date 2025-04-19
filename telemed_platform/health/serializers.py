# health/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, DoctorProfile, PatientProfile, Appointment, HealthRecord, Role
from django.db import transaction # For atomic operations

# --- Base Serializers ---

# Basic User Serializer (for displaying user info - Read Only)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = fields # Ensure read-only in this context


# Serializer for UPDATING User model fields (used internally by UserProfileSerializer)
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Only fields allowed to be updated via profile PUT/PATCH
        fields = ['first_name', 'last_name', 'email']
        extra_kwargs = {
            # Make fields optional for PATCH requests
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False}
         }


# Serializer for Doctor Details (used for display and internal update)
class DoctorDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ['specialization', 'years_of_experience', 'license_number']
        read_only_fields = ['license_number'] # License likely not editable
        extra_kwargs = { # Allow partial updates (PATCH)
            'specialization': {'required': False},
            'years_of_experience': {'required': False, 'allow_null': True} # Allow setting experience to null? Or handle in update
         }

# Serializer for Patient Details (used for display and internal update)
class PatientDetailSerializer(serializers.ModelSerializer):
    # Define relationship field if it exists on your PatientProfile model
    # emergency_contact_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = PatientProfile
        fields = [
            'emergency_contact_name',
            'emergency_contact_phone',
            # 'emergency_contact_relationship' # Add field here if it exists in model
            ]
        extra_kwargs = { # Allow partial updates (PATCH)
            'emergency_contact_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_phone': {'required': False, 'allow_blank': True, 'allow_null': True},
            # 'emergency_contact_relationship': {'required': False, 'allow_blank': True, 'allow_null': True}
         }


# --- Main Model Serializers ---

# User Profile Serializer (Handles GET and PUT/PATCH with Nested Updates)
class UserProfileSerializer(serializers.ModelSerializer):
    # --- Fields for Reading (GET) ---
    user = UserSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    # Display nested details based on role using SerializerMethodField for cleaner GET
    details = serializers.SerializerMethodField()

    # --- Fields for Writing (PUT/PATCH) ---
    # Use separate fields with write_only=True to accept nested data for update
    user_update = UserUpdateSerializer(write_only=True, required=False)
    patient_details_update = PatientDetailSerializer(write_only=True, required=False)
    doctor_details_update = DoctorDetailSerializer(write_only=True, required=False)


    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role', 'role_display', # Core fields
            'phone_number', 'address', 'date_of_birth', # Profile fields
            'details', # Read-only nested details for GET
            # Write-only fields for accepting update data
            'user_update',
            'patient_details_update',
            'doctor_details_update',
        ]
        read_only_fields = ['id', 'role', 'role_display', 'user', 'details'] # Only profile fields are directly updatable here
         # Make direct profile fields optional for PATCH requests
        extra_kwargs = {
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
         }

    def get_details(self, instance: UserProfile):
        """
        Dynamically returns patient or doctor details based on user role for GET requests.
        """
        if instance.role == Role.PATIENT:
            # Use PatientDetailSerializer for patient users
            # Handle case where patient_details might not exist yet
            try:
                serializer = PatientDetailSerializer(instance.patient_details)
                return serializer.data
            except PatientProfile.DoesNotExist:
                return None
        elif instance.role == Role.DOCTOR:
            # Use DoctorDetailSerializer for doctor users
             try:
                serializer = DoctorDetailSerializer(instance.doctor_details)
                return serializer.data
             except DoctorProfile.DoesNotExist:
                return None
        return None # Or empty dict {}

    @transaction.atomic
    def update(self, instance: UserProfile, validated_data):
        """
        Handle updates to UserProfile and potentially nested User and Patient/Doctor details.
        """
        # Pop the write-only nested data dictionaries
        user_update_data = validated_data.pop('user_update', None)
        patient_details_update_data = validated_data.pop('patient_details_update', None)
        doctor_details_update_data = validated_data.pop('doctor_details_update', None)

        # Update direct UserProfile fields using default ModelSerializer behavior
        # validated_data now only contains 'phone_number', 'address', 'date_of_birth' if they were sent
        instance = super().update(instance, validated_data)

        # --- Update Nested User ---
        if user_update_data:
            user_instance = instance.user
            user_serializer = UserUpdateSerializer(instance=user_instance, data=user_update_data, partial=self.partial)
            if user_serializer.is_valid(): # Perform validation
                user_serializer.save()
            else:
                # Raise validation error if nested user data is invalid
                raise serializers.ValidationError(user_serializer.errors)

        # --- Update Nested Patient Details ---
        if patient_details_update_data and instance.role == Role.PATIENT:
            # Get or Create the related PatientProfile instance
            patient_profile_instance, created = PatientProfile.objects.get_or_create(user_profile=instance)
            patient_serializer = PatientDetailSerializer(instance=patient_profile_instance, data=patient_details_update_data, partial=self.partial)
            if patient_serializer.is_valid(): # Perform validation
                patient_serializer.save()
            else:
                 # Raise validation error if nested patient data is invalid
                raise serializers.ValidationError(patient_serializer.errors)

        # --- Update Nested Doctor Details ---
        if doctor_details_update_data and instance.role == Role.DOCTOR:
             # Get or Create the related DoctorProfile instance
            doctor_profile_instance, created = DoctorProfile.objects.get_or_create(user_profile=instance)
            doctor_serializer = DoctorDetailSerializer(instance=doctor_profile_instance, data=doctor_details_update_data, partial=self.partial)
            if doctor_serializer.is_valid(): # Perform validation
                doctor_serializer.save()
            else:
                 # Raise validation error if nested doctor data is invalid
                raise serializers.ValidationError(doctor_serializer.errors)

        instance.refresh_from_db() # Refresh the instance from DB before returning
        return instance


# --- Registration Serializer ---
class RegisterSerializer(serializers.ModelSerializer):
    # ... (Keep the RegisterSerializer code exactly as provided in the previous response)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, min_length=8)
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password", style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=Role.choices, write_only=True, required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=True, max_length=20)
    address = serializers.CharField(required=True)
    date_of_birth = serializers.DateField(required=True)
    specialization = serializers.CharField(required=False, allow_blank=True, max_length=100)
    license_number = serializers.CharField(required=False, allow_blank=True, max_length=50)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    emergency_contact_relationship = serializers.CharField(required=False, allow_blank=True, max_length=50)

    class Meta:
        model = User
        fields = [ 'username', 'email', 'first_name', 'last_name', 'password', 'password2', 'role', 'phone_number', 'address', 'date_of_birth', 'specialization', 'license_number', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship' ]
        extra_kwargs = { 'username': {'min_length': 3} }

    def validate(self, attrs): /* ... */
    @transaction.atomic
    def create(self, validated_data): /* ... */


# --- Health Record Serializer ---
class HealthRecordSerializer(serializers.ModelSerializer):
    # ... (Keep as before) ...
    patient_username = serializers.ReadOnlyField(source='patient.username')
    class Meta: model = HealthRecord; fields = [ ... ]; read_only_fields = [...]


# --- Appointment Serializers ---
# Appointment Serializer (Handles Create/Retrieve/Update logic)
class AppointmentSerializer(serializers.ModelSerializer):
    # ... (Keep as before, ensuring patient_id/doctor_id are write_only with source) ...
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(profile__role=Role.PATIENT), source='patient', write_only=True, required=True)
    doctor_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(profile__role=Role.DOCTOR), source='doctor', write_only=True, required=True)

    class Meta: model = Appointment; fields = [ ... ]; read_only_fields = [...]; extra_kwargs = { ... }
    def validate_appointment_time(self, value): /* ... */


# Appointment List Serializer (For read-only lists)
class AppointmentListSerializer(serializers.ModelSerializer):
    # ... (Keep as before) ...
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    class Meta: model = Appointment; fields = ['id', 'patient_name', 'doctor_name', 'appointment_time', 'status', 'status_display', 'reason']


# --- Doctor/Patient List Serializers ---
# Serializer for Doctors viewing their Patients list
class DoctorPatientSerializer(serializers.ModelSerializer):
    # ... (Keep as before) ...
    email = serializers.CharField(source='user.email', read_only=True); first_name = serializers.CharField(source='user.first_name', read_only=True); last_name = serializers.CharField(source='user.last_name', read_only=True); phone_number = serializers.CharField(source='profile.phone_number', read_only=True); date_of_birth = serializers.DateField(source='profile.date_of_birth', read_only=True)
    class Meta: model = User; fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'date_of_birth']