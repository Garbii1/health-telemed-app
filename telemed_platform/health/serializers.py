# health/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, DoctorProfile, PatientProfile, Appointment, HealthRecord, Role
from django.db import transaction # For atomic operations

# --- Base Serializers ---

# Basic User Serializer (for displaying user info within other objects)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Fields suitable for display (read-only context)
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = fields # Make all fields read-only by default in this context


# Serializer specifically for UPDATING User model fields (e.g., via profile update)
# Only include fields you want to allow updating via the profile endpoint
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']
        # Optionally add extra validation if needed
        extra_kwargs = {
            'email': {'required': False}, # Make fields optional for PATCH
            'first_name': {'required': False},
            'last_name': {'required': False}
         }


# Specific Serializer for Doctor Details (used for nesting)
class DoctorDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        # Exclude user_profile link as it's handled by the parent UserProfileSerializer
        fields = ['specialization', 'years_of_experience', 'license_number']
        read_only_fields = ['license_number'] # License number usually shouldn't change
        extra_kwargs = { # Allow partial updates (PATCH)
            'specialization': {'required': False},
            'years_of_experience': {'required': False}
         }

# Specific Serializer for Patient Details (used for nesting)
class PatientDetailSerializer(serializers.ModelSerializer):
    # Add relationship field if you added it to the PatientProfile model
    # emergency_contact_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True) # Example

    class Meta:
        model = PatientProfile
        # Exclude user_profile link
        fields = ['emergency_contact_name', 'emergency_contact_phone'] # Add 'emergency_contact_relationship' here if added to model
        extra_kwargs = { # Allow partial updates (PATCH)
            'emergency_contact_name': {'required': False},
            'emergency_contact_phone': {'required': False},
            # 'emergency_contact_relationship': {'required': False}
         }


# --- Main Model Serializers ---

# User Profile Serializer (Handles Retrieving and Nested Updating)
class UserProfileSerializer(serializers.ModelSerializer):
    # Nest related serializers - use the specific update/detail versions
    # Make user details read-only on retrieval, but allow write via UserUpdateSerializer during update
    user = UserSerializer(read_only=True) # Display user details on GET
    user_update = UserUpdateSerializer(write_only=True, required=False, source='user') # Accept user updates on PUT/PATCH

    # Use source='*' with SerializerMethodField if role determines which nested detail to show/update
    # Or handle conditionally in update method. Let's try conditional update.
    # Display related details based on role (read-only for GET)
    doctor_details = DoctorDetailSerializer(read_only=True, required=False)
    patient_details = PatientDetailSerializer(read_only=True, required=False)

    # Accept nested details for writing (write_only)
    doctor_details_update = DoctorDetailSerializer(write_only=True, required=False, source='doctor_details')
    patient_details_update = PatientDetailSerializer(write_only=True, required=False, source='patient_details')

    # Include role for display, but make it read-only during updates via this serializer
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role', 'role_display', 'phone_number', 'address', 'date_of_birth',
            'doctor_details', 'patient_details', # Read-only nested fields for GET
            # Write-only fields for PUT/PATCH
            'user_update',
            'doctor_details_update',
            'patient_details_update'
        ]
        read_only_fields = ['id', 'role'] # Role shouldn't be changed here
        # Make base profile fields optional for PATCH requests
        extra_kwargs = {
            'phone_number': {'required': False},
            'address': {'required': False},
            'date_of_birth': {'required': False, 'allow_null': True},
         }

    @transaction.atomic # Ensure all updates happen together or none
    def update(self, instance: UserProfile, validated_data):
        # Pop nested data first
        user_data = validated_data.pop('user', None) # Use source name 'user'
        doctor_data = validated_data.pop('doctor_details', None) # Use source name 'doctor_details'
        patient_data = validated_data.pop('patient_details', None) # Use source name 'patient_details'

        # Update UserProfile fields (phone_number, address, date_of_birth)
        # This uses the default ModelSerializer update logic for direct fields
        instance = super().update(instance, validated_data)

        # Update nested User fields if data provided
        if user_data:
            user = instance.user
            # Use the UserUpdateSerializer to update the user instance
            user_serializer = UserUpdateSerializer(instance=user, data=user_data, partial=self.partial) # Pass partial=True for PATCH
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        # Update nested DoctorProfile fields if data provided and user is a Doctor
        if doctor_data and instance.role == Role.DOCTOR:
            # Get or create the related doctor profile
            doctor_profile, created = DoctorProfile.objects.get_or_create(user_profile=instance)
            # Use the DoctorDetailSerializer to update the doctor profile instance
            doctor_serializer = DoctorDetailSerializer(instance=doctor_profile, data=doctor_data, partial=self.partial)
            doctor_serializer.is_valid(raise_exception=True)
            doctor_serializer.save()

        # Update nested PatientProfile fields if data provided and user is a Patient
        if patient_data and instance.role == Role.PATIENT:
            # Get or create the related patient profile
            patient_profile, created = PatientProfile.objects.get_or_create(user_profile=instance)
             # Use the PatientDetailSerializer to update the patient profile instance
            patient_serializer = PatientDetailSerializer(instance=patient_profile, data=patient_data, partial=self.partial)
            patient_serializer.is_valid(raise_exception=True)
            patient_serializer.save()

        instance.refresh_from_db() # Refresh instance data after nested updates
        return instance

# Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, min_length=8)
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password", style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=Role.choices, write_only=True, required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)

    # Profile fields (now required based on previous request)
    phone_number = serializers.CharField(required=True, max_length=20) # Added max_length
    address = serializers.CharField(required=True)
    date_of_birth = serializers.DateField(required=True)

    # Doctor specific fields (conditionally required)
    specialization = serializers.CharField(required=False, allow_blank=True, max_length=100)
    license_number = serializers.CharField(required=False, allow_blank=True, max_length=50)

    # Patient specific fields (optional emergency contact)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    emergency_contact_relationship = serializers.CharField(required=False, allow_blank=True, max_length=50) # Added relationship


    class Meta:
        model = User
        # Include all fields needed for User creation + profile/role specific fields
        fields = [
            'username', 'email', 'first_name', 'last_name', 'password', 'password2',
            'role', # Role choice
            'phone_number', 'address', 'date_of_birth', # Required Profile fields
            'specialization', 'license_number', # Doctor fields
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship' # Patient fields
        ]
        extra_kwargs = {
            'username': {'min_length': 3}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        role = attrs.get('role')
        # Conditionally require doctor fields only if role is Doctor
        if role == Role.DOCTOR:
            if not attrs.get('specialization'):
                 raise serializers.ValidationError({"specialization": "Specialization is required for Doctors."})
            if not attrs.get('license_number'):
                 raise serializers.ValidationError({"license_number": "License number is required for Doctors."})
        return attrs

    @transaction.atomic # Ensure all objects are created or none are
    def create(self, validated_data):
        # Pop role and profile data
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        validated_data.pop('password2') # Don't save confirmation password

        phone_number = validated_data.pop('phone_number') # Required now
        address = validated_data.pop('address')          # Required now
        date_of_birth = validated_data.pop('date_of_birth')  # Required now

        specialization = validated_data.pop('specialization', None)
        license_number = validated_data.pop('license_number', None)

        emergency_contact_name = validated_data.pop('emergency_contact_name', None)
        emergency_contact_phone = validated_data.pop('emergency_contact_phone', None)
        emergency_contact_relationship = validated_data.pop('emergency_contact_relationship', None) # Pop new field

        # Create User using create_user to handle password hashing
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=password
        )

        # Create UserProfile
        user_profile = UserProfile.objects.create(
            user=user,
            role=role,
            phone_number=phone_number,
            address=address,
            date_of_birth=date_of_birth
        )

        # Create Doctor or Patient specific profile
        if role == Role.DOCTOR:
            DoctorProfile.objects.create(
                user_profile=user_profile,
                specialization=specialization,
                license_number=license_number
            )
        elif role == Role.PATIENT:
             # Add relationship to create call if it exists in the model
            PatientProfile.objects.create(
                user_profile=user_profile,
                emergency_contact_name=emergency_contact_name,
                emergency_contact_phone=emergency_contact_phone
                # emergency_contact_relationship=emergency_contact_relationship # Uncomment if field added to PatientProfile model
            )

        return user # Return the created user


# Health Record Serializer
class HealthRecordSerializer(serializers.ModelSerializer):
    # Display patient username read-only for context
    patient_username = serializers.ReadOnlyField(source='patient.username')

    class Meta:
        model = HealthRecord
        fields = [
            'id', 'patient', 'patient_username', 'record_time',
            'blood_pressure_systolic', 'blood_pressure_diastolic',
            'heart_rate', 'glucose_level', 'temperature', 'notes'
            ]
        read_only_fields = ['patient', 'record_time'] # Patient set by view, record_time auto-set

# Appointment Serializer (Handles Create/Retrieve/Update)
class AppointmentSerializer(serializers.ModelSerializer):
    # Display details read-only
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True) # Show display value

    # Accept IDs for write operations
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(profile__role=Role.PATIENT),
        source='patient', # Link to model field 'patient'
        write_only=True,  # Use only for input
        required=True     # Make required for create
    )
    doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(profile__role=Role.DOCTOR),
        source='doctor', # Link to model field 'doctor'
        write_only=True,
        required=True
    )

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'doctor', 'patient_id', 'doctor_id', # Include IDs for write
            'appointment_time', 'reason', 'status', 'status_display', # Include display status
            'consultation_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'status_display', 'consultation_notes',
            'created_at', 'updated_at', 'patient', 'doctor'
            ] # Control status/notes via specific actions/logic
        extra_kwargs = {
             # Ensure these are optional if allowing PATCH, required for POST handled by view/serializer logic
            'appointment_time': {'required': True}, # Required on create
            'reason': {'required': False, 'allow_blank': True},
        }

    def validate_appointment_time(self, value):
        """
        Check that the appointment time is in the future.
        """
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Appointment time must be in the future.")
        # Add any other business logic checks (e.g., within business hours, doctor availability)
        return value


# Simplified Appointment Serializer for Listing
class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True) # Show display value

    class Meta:
        model = Appointment
        fields = ['id', 'patient_name', 'doctor_name', 'appointment_time', 'status', 'status_display', 'reason']


# Serializer for Doctors viewing their Patients
class DoctorPatientSerializer(serializers.ModelSerializer):
    # Include fields from related User and UserProfile models
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', read_only=True)
    # Optionally include patient-specific details if needed
    # patient_details = PatientDetailSerializer(source='profile.patient_details', read_only=True)

    class Meta:
        model = User # Serializes the User model representing the patient
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'phone_number', 'date_of_birth',
            # 'patient_details' # Add if needed
        ]