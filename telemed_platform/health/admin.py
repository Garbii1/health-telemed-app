# telemed_platform/health/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, DoctorProfile, PatientProfile, Appointment, HealthRecord

# --- Inline Admins ---

# Define an inline admin descriptor for UserProfile which can be shown in User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'
    # Optionally customize fields shown
    # fields = ('role', 'phone_number', 'address', 'date_of_birth')

# Define an inline admin descriptor for DoctorProfile to show within UserProfile admin (if needed)
# Or register DoctorProfile separately if preferred
class DoctorProfileInline(admin.StackedInline):
    model = DoctorProfile
    can_delete = False
    verbose_name_plural = 'Doctor Specific Details'

# Define an inline admin descriptor for PatientProfile
class PatientProfileInline(admin.StackedInline):
    model = PatientProfile
    can_delete = False
    verbose_name_plural = 'Patient Specific Details'


# --- Main Model Admins ---

# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,) # Add the profile inline to the User admin

    # Optionally add profile fields to list display
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_role') # Add get_role method
    list_select_related = ('profile',) # Optimize query

    @admin.display(description='Role')
    def get_role(self, instance):
        # Safely get role from profile
        try:
            return instance.profile.get_role_display() # Use get_FOO_display for choice fields
        except UserProfile.DoesNotExist:
            return 'No Profile'
    # Add role filter?
    # list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups', 'profile__role') # Filter by role


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone_number', 'date_of_birth')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'phone_number')
    # Add doctor/patient specifics inline if desired
    # inlines = [DoctorProfileInline, PatientProfileInline] # This might get crowded, choose one way

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'specialization', 'license_number', 'years_of_experience')
    search_fields = ('user_profile__user__username', 'specialization', 'license_number')
    list_select_related = ('user_profile__user',) # Optimize query

    @admin.display(description='Username', ordering='user_profile__user__username')
    def get_username(self, obj):
        return obj.user_profile.user.username

@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'emergency_contact_name', 'emergency_contact_phone')
    search_fields = ('user_profile__user__username', 'emergency_contact_name')
    list_select_related = ('user_profile__user',) # Optimize query

    @admin.display(description='Username', ordering='user_profile__user__username')
    def get_username(self, obj):
        return obj.user_profile.user.username


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'appointment_time', 'status', 'reason_short')
    list_filter = ('status', 'doctor', 'patient') # Allow filtering by doctor/patient
    search_fields = ('patient__username', 'doctor__username', 'reason')
    list_select_related = ('patient', 'doctor') # Optimize queries
    date_hierarchy = 'appointment_time' # Add date navigation
    ordering = ('-appointment_time',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('patient', 'doctor', 'appointment_time', 'status')}),
        ('Details', {'fields': ('reason', 'consultation_notes')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Reason (Short)')
    def reason_short(self, obj):
        # Display a truncated version of the reason
        if obj.reason:
            return obj.reason[:50] + '...' if len(obj.reason) > 50 else obj.reason
        return '-'


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'record_time', 'get_bp', 'heart_rate', 'glucose_level', 'temperature')
    list_filter = ('patient',) # Filter by patient
    search_fields = ('patient__username', 'notes')
    list_select_related = ('patient',) # Optimize query
    date_hierarchy = 'record_time'
    ordering = ('-record_time',)
    readonly_fields = ('record_time',) # Record time is auto-set

    @admin.display(description='Blood Pressure')
    def get_bp(self, obj):
        # Combine BP fields for display
        if obj.blood_pressure_systolic is not None or obj.blood_pressure_diastolic is not None:
            return f"{obj.blood_pressure_systolic or '-'} / {obj.blood_pressure_diastolic or '-'}"
        return 'N/A'