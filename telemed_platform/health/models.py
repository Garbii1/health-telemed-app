from django.db import models
from django.contrib.auth.models import User # Use the default User model
from django.utils import timezone

# Extending User with Roles using Profiles
class Role(models.TextChoices):
    PATIENT = 'PATIENT', 'Patient'
    DOCTOR = 'DOCTOR', 'Doctor'

# Profile linked to the User model
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=Role.choices)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    # Add profile picture later if needed: profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

# Specific Doctor Profile Info (if needed beyond UserProfile)
class DoctorProfile(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='doctor_details')
    specialization = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    years_of_experience = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Dr. {self.user_profile.user.get_full_name()} - {self.specialization}"

# Specific Patient Profile Info (if needed beyond UserProfile)
class PatientProfile(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='patient_details')
    # Add any patient-specific fields, e.g., emergency contact
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"Patient: {self.user_profile.user.username}"


class Appointment(models.Model):
    class StatusChoices(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        RESCHEDULED = 'RESCHEDULED', 'Rescheduled' # Maybe handle rescheduling logic separately

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_appointments', limit_choices_to={'profile__role': Role.PATIENT})
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments', limit_choices_to={'profile__role': Role.DOCTOR})
    appointment_time = models.DateTimeField()
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=StatusChoices.choices, default=StatusChoices.SCHEDULED)
    consultation_notes = models.TextField(blank=True, null=True) # Notes added by doctor after consultation
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Optional: Add video call link if integrating WebRTC/Third-party service
    # video_call_link = models.URLField(max_length=500, blank=True, null=True)

    def __str__(self):
        return f"Appointment for {self.patient.username} with Dr. {self.doctor.username} on {self.appointment_time.strftime('%Y-%m-%d %H:%M')}"

class HealthRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_records', limit_choices_to={'profile__role': Role.PATIENT})
    record_time = models.DateTimeField(default=timezone.now)
    blood_pressure_systolic = models.PositiveIntegerField(blank=True, null=True)
    blood_pressure_diastolic = models.PositiveIntegerField(blank=True, null=True)
    heart_rate = models.PositiveIntegerField(blank=True, null=True) # Beats per minute
    glucose_level = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True) # mg/dL or mmol/L - specify unit in frontend
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True) # Celsius or Fahrenheit
    notes = models.TextField(blank=True, null=True) # Additional notes by patient or doctor

    def __str__(self):
        return f"Health Record for {self.patient.username} at {self.record_time.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        ordering = ['-record_time'] # Show newest records first