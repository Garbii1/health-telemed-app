// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // Import HttpParams
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Type alias for params object for better readability
type ApiParams = { [param: string]: string | number | boolean };

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // --- Helper to build HttpParams ---
  private buildParams(params?: ApiParams): HttpParams {
      let httpParams = new HttpParams();
      if (params) {
          Object.keys(params).forEach(key => {
              // Ensure value is converted to string for HttpParams
              httpParams = httpParams.set(key, String(params[key]));
          });
      }
      return httpParams;
  }

  // --- Health Records ---
  getVitals(params?: ApiParams): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vitals/`, { params: this.buildParams(params) });
  }

  addVitalRecord(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/vitals/`, data);
  }

  getVitalRecord(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vitals/${id}/`);
  }

  // --- Appointments ---
  getAppointments(params?: ApiParams): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/`, { params: this.buildParams(params) });
  }

  bookAppointment(data: { doctor_id: number, appointment_time: string, reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/`, data);
  }

  getAppointment(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${id}/`);
  }

  cancelAppointment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${id}/cancel/`, {});
  }

  completeAppointment(id: number, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${id}/complete/`, { consultation_notes: notes });
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
      // Use PUT or PATCH based on your backend endpoint definition
      return this.http.put<any>(`${this.apiUrl}/profile/`, data);
   }
}