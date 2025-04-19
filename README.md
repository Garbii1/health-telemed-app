# HealthConnect: Health Monitoring and Telemedicine Platform

<p align="center">
  <img src="telemed-ui/src/assets/logo.png?raw=true" alt="HealthConnect Logo" width="150">
</p>

<p align="center">
  A full-stack web application enabling patients to manage health profiles, monitor vitals, and book virtual consultations, while allowing doctors to manage patient interactions and appointments.
</p>

<p align="center">
  <a href="https://health-telemed-app.vercel.app/"><strong>Live Demo »</strong></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Angular-DD0031?logo=angular&logoColor=white" alt="Angular">
  <img src="https://img.shields.io/badge/Backend-Django-092E20?logo=django&logoColor=white" alt="Django">
  <img src="https://img.shields.io/badge/API-DRF-A30000?logo=django&logoColor=white" alt="DRF">
  <img src="https://img.shields.io/badge/Deployment--FE-Vercel-black?logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Deployment--BE-PythonAnywhere-3776AB?logo=python&logoColor=white" alt="PythonAnywhere">
  <a href="https://github.com/Garbii1/health-telemed-app/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
  </a>
</p>

---

## Table of Contents

*   [Overview](#overview)
*   [Live Demo](#live-demo)
*   [Screenshots](#screenshots)
*   [Features](#features)
*   [Tech Stack](#tech-stack)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Backend Setup](#backend-setup-django)
    *   [Frontend Setup](#frontend-setup-angular)
*   [API Endpoints Overview](#api-endpoints-overview)
*   [Deployment](#deployment)
*   [Challenges Faced & Solutions](#challenges-faced--solutions)
*   [Future Improvements](#future-improvements)
*   [Author](#author)
*   [License](#license)

## Overview

HealthConnect is a comprehensive telemedicine platform designed to bridge the gap between patients and doctors. It provides a seamless interface for patients to track their vital health statistics (like blood pressure, glucose levels), manage their profiles, and schedule virtual consultations. Doctors can efficiently view assigned patient information, manage their schedules, and record consultation notes, facilitating better remote healthcare delivery.

This project demonstrates the integration of a robust Django REST Framework backend with a dynamic Angular frontend, deployed using free-tier services.

## Live Demo

Explore the live application hosted on Vercel:

**[https://health-telemed-app.vercel.app/](https://health-telemed-app.vercel.app/)**

*(Note: Backend hosted on PythonAnywhere free tier, which may occasionally be slower.)*

## Screenshots


| Page              | Screenshot                                   |
| :---------------- | :------------------------------------------- |
| Homepage          | ![Homepage](/screenshots/homepage.jpeg) |
| Login             | ![Login](/screenshots/loginpage.jpeg)       |
| Register          | ![Register](/screenshots/registerpage.jpeg) |
| Patient Dashboard | ![Patient Dashboard](/screenshots/patientdashboardpage.jpeg) |
| Book Appointment  | ![Book Appointment](/screenshots/patientbook-appointmentpage.jpeg) |
| My Vitals         | ![My Vitals](/screenshots/patientvitalspage.jpeg) |
| My Profile        | ![My Profile](/screenshots/patientprofilepage.jpeg) |
| My Appointments   | ![My Appointments](/screenshots/patientappointmentspage.jpeg) |
| Mobile Menu       | ![Mobile Menu](/screenshots/navigationpanel.jpeg) |

## Features

**Implemented Features:**

*   **User Authentication:** Secure JWT-based registration and login for Patients and Doctors.
*   **Role-Based Access:** Distinct functionalities and dashboards for Patients and Doctors.
*   **Profile Management:** Users can view and update their profile information (contact details, DOB, etc.). Doctors can manage specialization details.
*   **Vital Signs Monitoring (Patient):** Patients can submit and track key health metrics (BP, Heart Rate, Glucose, Temperature).
*   **Vitals History & Trends (Patient):** View historical vital records in both table format and basic line charts (`ngx-charts`).
*   **Appointment Booking (Patient):** Patients can select an available doctor and schedule virtual appointments.
*   **Appointment Management (Patient):** View upcoming and past appointments, filter by status, cancel scheduled appointments.
*   **Appointment Management (Doctor):** View assigned appointments schedule, filter by status, mark appointments as complete, and add consultation notes.
*   **Patient List (Doctor):** Doctors can view a list of patients associated with their appointments.
*   **Responsive Design:** UI adapts to different screen sizes (Desktop, Tablet, Mobile).
*   **Modern UI:** Clean and user-friendly interface.
*   **API Backend:** RESTful API endpoints for all core functionalities.

## Tech Stack

*   **Backend:**
    *   Python 3.x
    *   Django 4.x
    *   Django REST Framework (DRF)
    *   djangorestframework-simplejwt (JWT Authentication)
    *   django-cors-headers (CORS Handling)
    *   SQLite (Database for free-tier deployment)
    *   django-environ (Environment variable management - recommended)
    *   WhiteNoise (Static file serving in production)
*   **Frontend:**
    *   TypeScript
    *   Angular 17+ (Standalone Components)
    *   Angular Router
    *   Angular Reactive Forms
    *   RxJS
    *   SCSS (CSS Preprocessor)
    *   ngx-charts (Charting Library)
    *   Bootstrap (Grid system and utility classes - optional, based on usage)
    *   Font Awesome (Icons - optional)
*   **Deployment:**
    *   **Backend:** PythonAnywhere (Free Tier)
    *   **Frontend:** Vercel (Free Tier)
*   **Version Control:** Git & GitHub

## Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites

*   Python (3.8 or higher recommended) & Pip
*   Node.js (LTS version recommended) & npm (or Yarn)
*   Git command-line tools

### Backend Setup (Django)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Garbii1/health-telemed-app.git
    cd health-telemed-app/telemed_platform
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # Windows: .\venv\Scripts\activate
    # macOS/Linux: source venv/bin/activate
    ```
3.  **Install backend dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Apply database migrations:**
    ```bash
    python manage.py migrate
    ```
5.  **Create a superuser (for admin access):**
    ```bash
    python manage.py createsuperuser
    ```
    (Follow prompts)
6.  **(Optional) Create a `.env` file** in the `telemed_platform` directory for local environment variables (especially `DJANGO_SECRET_KEY`). Make sure `.env` is in your `.gitignore`.
    ```env
    DJANGO_SECRET_KEY='your-local-secret-key-here-12345'
    DEBUG=True
    ```
7.  **Run the Django development server:**
    ```bash
    python manage.py runserver
    ```
    The backend API will be available at `http://127.0.0.1:8000/api/`.

### Frontend Setup (Angular)

1.  **Navigate to the frontend directory:**
    ```bash
    # From the project root (health-telemed-app)
    cd telemed-ui
    ```
2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```
3.  **Verify environment files:**
    *   `src/environments/environment.ts` should point to the local backend: `apiUrl: 'http://127.0.0.1:8000/api'`
    *   `src/environments/environment.prod.ts` should point to the live backend: `apiUrl: 'https://garbimuhd.pythonanywhere.com/api'`
4.  **Run the Angular development server:**
    ```bash
    ng serve -o
    ```
    The frontend app will open automatically at `http://localhost:4200/`. Ensure the backend server is also running.

## API Endpoints Overview

The backend provides the following core RESTful endpoints under `/api/`:

*   `/register/` (POST): User registration (Patient/Doctor).
*   `/login/` (POST): Obtain JWT access/refresh tokens.
*   `/login/refresh/` (POST): Refresh JWT access token.
*   `/profile/` (GET, PUT, PATCH): Manage current user's profile (Auth required).
*   `/doctors/` (GET): List available doctors (Auth required).
*   `/appointments/` (GET, POST): List user's appointments or book a new one (Auth required).
*   `/appointments/{id}/` (GET): Get specific appointment details (Auth required).
*   `/appointments/{id}/cancel/` (POST): Cancel a scheduled appointment (Auth required).
*   `/appointments/{id}/complete/` (POST): Mark appointment as complete & add notes (Doctor role required).
*   `/vitals/` (GET, POST): List patient's vital records or submit a new one (Auth required).
*   `/vitals/{id}/` (GET, PUT, PATCH, DELETE): Manage specific vital record (Permissions apply).
*   `/doctor/patients/` (GET): List patients assigned to the doctor (Doctor role required).

*(Refer to `health/urls.py` and `health/views.py` for detailed routing and view logic).*

## Deployment

This application is deployed using free tiers:

*   **Backend (Django):** Hosted on [PythonAnywhere](https://www.pythonanywhere.com/). Requires setting up a web app, cloning the repo, creating a virtualenv, installing dependencies, configuring the WSGI file, setting environment variables (especially `DJANGO_SECRET_KEY`), collecting static files, and running migrations. `DEBUG` must be `False`, and `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` must include the Vercel domain.
*   **Frontend (Angular):** Hosted on [Vercel](https://vercel.com/). Requires linking the GitHub repository, ensuring the build command is `ng build --configuration=production`, and setting the output directory to `dist/telemed-ui`. Vercel handles the build and deployment process automatically upon Git pushes.

## Challenges Faced & Solutions

*   **CORS Errors:** Initial deployment faced CORS errors because the backend didn't explicitly allow requests from the Vercel frontend origin. **Solution:** Correctly configured `django-cors-headers` in `settings.py` (`INSTALLED_APPS`, `MIDDLEWARE`, `CORS_ALLOWED_ORIGINS`) and reloaded the backend server.
*   **Environment Variables:** The frontend build on Vercel initially used the local development API URL. **Solution:** Corrected the `fileReplacements` configuration in `angular.json` to ensure `environment.prod.ts` (with the live backend URL) was used during the production build (`ng build --configuration=production`). Redeployed without Vercel cache.
*   **Standalone Component Errors:** Transitioning to Angular's standalone components required careful management of imports. Directives like `*ngIf`, `*ngFor`, `formGroup`, `routerLink`, pipes (`async`, `date`), and child components needed to be imported directly into the `imports: []` array of each standalone component using them, rather than relying on `NgModule` declarations. **Solution:** Systematically identified components generating template errors (NG8xxx) and added the required imports (`CommonModule`, `ReactiveFormsModule`, `RouterLink`, specific child components, `NgxChartsModule`, etc.) to their respective `@Component` decorators. Removed obsolete `NgModule` files (`AppModule`, `AuthModule`, etc.) and routing modules, switching to functional route providers (`provideRouter` in `main.ts`) and route arrays (`app.routes.ts`, `patient.routes.ts`, etc.).
*   **Angular Forms `_rawValidators` Error:** A persistent `TypeError` occurred during profile loading, related to Angular Forms internal state, likely due to asynchronous patching of nested form groups. **Solution:** Implemented defensive patching strategies, ensuring nested groups were properly handled (resetting/recreating controls before patching) and experimenting with `NgZone` and `setTimeout` to manage change detection timing around the patching process. Explicitly initializing the form structure in the constructor/`buildForm` and patching control-by-control or group-by-group proved more stable than patching the entire form object at once.
*   **SCSS Function Errors:** Deprecated SASS functions (`darken`) failed when used with CSS variables (`var(...)`). **Solution:** Replaced `darken(var(--color), ...)` with `color.adjust($scss-color-var, ...)` using corresponding SCSS variables defined alongside the CSS variables.

## Future Improvements

*   **WebRTC/Video Calls:** Integrate real-time video consultations (e.g., using Twilio, Daily.co, or native WebRTC).
*   **Notifications:** Implement email/SMS reminders for upcoming appointments (potentially using Celery + Redis on the backend).
*   **Enhanced Dashboards:** Add more insightful charts and data analytics for both patients and doctors.
*   **File Uploads:** Allow uploading profile pictures or medical documents.
*   **Password Reset:** Implement a secure password reset flow.
*   **Advanced Filtering/Search:** Improve filtering options for appointments and patient lists.
*   **Unit/Integration Tests:** Add comprehensive backend (Django tests) and frontend (Karma/Jasmine) tests.
*   **Error Monitoring:** Integrate error tracking services (e.g., Sentry).

## Author

*   **Muhammed Babatunde Garuba**
*   GitHub: [@Garbii1](https://github.com/Garbii1)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)