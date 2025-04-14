// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // --- Health Records ---
  getVitals(params?: HttpParams): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vitals/`, { params });
  }

  addVitalRecord(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/vitals/`, data);
  }

  getVitalRecord(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vitals/${id}/`);
  }

  // --- Appointments ---
  getAppointments(params?: HttpParams): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/`, { params });
  }

  bookAppointment(data: { doctor_id: number, appointment_time: string, reason?: string }): Observable<any> {
     // Ensure appointment_time is in ISO format expected by Django (e.g., YYYY-MM-DDTHH:mm:ssZ)
     // The data structure matches AppointmentSerializer write_only fields
    return this.http.post(`${this.apiUrl}/appointments/`, data);
  }

  getAppointment(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${id}/`);
  }

  cancelAppointment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${id}/cancel/`, {}); // Custom action
  }

  completeAppointment(id: number, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${id}/complete/`, { consultation_notes: notes }); // Custom action
  }

  // --- Doctors ---
  getDoctors(): Observable<any[]> {
     return this.http.get<any[]>(`${this.apiUrl}/doctors/`);
   }

   getDoctorPatients(): Observable<any[]> {
     return this.http.get<any[]>(`${this.apiUrl}/doctor/patients/`);
   }

   // --- User Profile ---
   getProfile(): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/profile/`);
   }

   updateProfile(data: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/profile/`, data);
   }

}