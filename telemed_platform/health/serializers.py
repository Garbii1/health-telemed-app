from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, DoctorProfile, PatientProfile, Appointment, HealthRecord, Role
from django.db import transaction # For atomic operations like user creation + profile

# Basic User Serializer (for showing user info)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

# User Profile Serializer
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) # Display user details, don't allow update via profile

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'role', 'phone_number', 'address', 'date_of_birth']


# Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password", style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=Role.choices, write_only=True, required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    # Optional fields for profile
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    # Doctor specific fields (optional during registration)
    specialization = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    # Patient specific fields (optional during registration)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)


    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'role',
                  'phone_number', 'address', 'date_of_birth', # Profile fields
                  'specialization', 'license_number', # Doctor fields
                  'emergency_contact_name', 'emergency_contact_phone'] # Patient fields

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        # Basic validation for role-specific fields if provided
        role = attrs.get('role')
        if role == Role.DOCTOR and not attrs.get('specialization'):
             raise serializers.ValidationError({"specialization": "Specialization is required for Doctors."})
        if role == Role.DOCTOR and not attrs.get('license_number'):
             raise serializers.ValidationError({"license_number": "License number is required for Doctors."})
        # Add more validation as needed
        return attrs

    @transaction.atomic # Ensure user and profile are created together
    def create(self, validated_data):
        # Pop profile and role data before creating user
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        validated_data.pop('password2')

        # Profile fields
        phone_number = validated_data.pop('phone_number', None)
        address = validated_data.pop('address', None)
        date_of_birth = validated_data.pop('date_of_birth', None)

        # Doctor fields
        specialization = validated_data.pop('specialization', None)
        license_number = validated_data.pop('license_number', None)

        # Patient fields
        emergency_contact_name = validated_data.pop('emergency_contact_name', None)
        emergency_contact_phone = validated_data.pop('emergency_contact_phone', None)


        # Create User instance
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=password # Use create_user to hash the password
        )

        # Create UserProfile
        user_profile = UserProfile.objects.create(
            user=user,
            role=role,
            phone_number=phone_number,
            address=address,
            date_of_birth=date_of_birth
        )

        # Create Doctor or Patient specific profile if applicable
        if role == Role.DOCTOR:
            DoctorProfile.objects.create(
                user_profile=user_profile,
                specialization=specialization,
                license_number=license_number
                # Add years_of_experience if collected during registration
            )
        elif role == Role.PATIENT:
            PatientProfile.objects.create(
                user_profile=user_profile,
                emergency_contact_name=emergency_contact_name,
                emergency_contact_phone=emergency_contact_phone
            )

        return user # Return the created user object

# Health Record Serializer
class HealthRecordSerializer(serializers.ModelSerializer):
    patient_username = serializers.ReadOnlyField(source='patient.username') # Show patient username

    class Meta:
        model = HealthRecord
        fields = ['id', 'patient', 'patient_username', 'record_time', 'blood_pressure_systolic',
                  'blood_pressure_diastolic', 'heart_rate', 'glucose_level', 'temperature', 'notes']
        read_only_fields = ['patient'] # Patient should be set automatically based on logged-in user

# Appointment Serializer
class AppointmentSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(profile__role=Role.PATIENT), source='patient', write_only=True)
    doctor_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(profile__role=Role.DOCTOR), source='doctor', write_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'doctor', 'patient_id', 'doctor_id', 'appointment_time',
                  'reason', 'status', 'consultation_notes', 'created_at', 'updated_at']
        read_only_fields = ['status', 'consultation_notes', 'created_at', 'updated_at'] # Status managed by specific actions

# Simplified Appointment Serializer for Listing (optional, can improve performance)
class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient_name', 'doctor_name', 'appointment_time', 'status', 'reason']


# Serializer for Doctors to view their assigned patients (based on appointments)
class DoctorPatientSerializer(serializers.ModelSerializer):
    # Include relevant patient details from User and UserProfile
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'date_of_birth']