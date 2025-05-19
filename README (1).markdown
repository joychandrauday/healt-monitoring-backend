# Healthcare API Documentation

This API provides endpoints for managing users, patient vitals, appointments, chats, and analytics in a healthcare system. All endpoints require **Firebase Authentication** with a JWT token in the `Authorization: Bearer <token>` header. Responses follow a standardized JSON format:

```json
{
  "status": "success" | "error",
  "data": object | null,
  "message": string | null,
  "error": string | null
}
```

## Base URL
`/api/v1`

## Authentication
- **Firebase JWT Token**: Required for all endpoints.
- **Header**: `Authorization: Bearer <token>`

## Modules

### 1. User Module
Manages user accounts for admins, doctors, and patients.

#### Endpoints

##### Register a New User
- **Method**: POST
- **Endpoint**: `/users/register`
- **Description**: Creates a Firebase account and MongoDB record for a new user.
- **Access**: Admin
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePass123",
    "name": "John Doe",
    "role": "patient" | "doctor" | "admin"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "_id": "mongo_id",
        "firebaseUid": "firebase_uid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "patient",
        "createdAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": "User registered"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized (invalid token)
  - 400: Invalid input (e.g., missing email)
  - 409: Email already exists
  - 500: Server error

##### Get User Profile
- **Method**: GET
- **Endpoint**: `/users/:id`
- **Description**: Retrieves a user’s profile.
- **Access**: Admin, Self
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "_id": "mongo_id",
        "firebaseUid": "firebase_uid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "patient",
        "createdAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-admin/self)
  - 404: User not found
  - 500: Server error

##### Update User Details
- **Method**: PUT
- **Endpoint**: `/users/:id`
- **Description**: Updates user email, name, or role.
- **Access**: Admin, Self
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "newuser@example.com", // optional
    "name": "Jane Doe", // optional
    "role": "doctor" // optional, admin-only
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "_id": "mongo_id",
        "firebaseUid": "firebase_uid",
        "email": "newuser@example.com",
        "name": "Jane Doe",
        "role": "doctor",
        "createdAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": "User updated"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-admin/self)
  - 400: Invalid input
  - 404: User not found
  - 409: Email taken
  - 500: Server error

##### Deactivate User
- **Method**: DELETE
- **Endpoint**: `/users/:id`
- **Description**: Soft deletes a user in MongoDB and disables their Firebase account.
- **Access**: Admin
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "User deactivated"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-admin)
  - 404: User not found
  - 500: Server error

##### List All Users
- **Method**: GET
- **Endpoint**: `/users`
- **Description**: Lists users with pagination and optional role filter.
- **Access**: Admin
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: Optional, default `1`
  - `limit`: Optional, default `10`
  - `role`: Optional, e.g., `patient`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "users": [
        {
          "_id": "mongo_id",
          "firebaseUid": "firebase_uid",
          "email": "user@example.com",
          "name": "John Doe",
          "role": "patient",
          "createdAt": "2025-05-15T10:17:00Z"
        }
      ],
      "total": 25,
      "page": 1,
      "pages": 3
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-admin)
  - 400: Invalid query parameters
  - 500: Server error

### 2. Vitals Module
Manages patient vital submissions and history, with Socket.io alerts for anomalies.

#### Endpoints

##### Submit Vitals
- **Method**: POST
- **Endpoint**: `/vitals`
- **Description**: Submits patient vitals, triggers Socket.io alert if critical.
- **Access**: Patient
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "heartRate": 80, // optional, bpm
    "bloodPressure": { // optional
      "systolic": 120,
      "diastolic": 80
    },
    "glucose": 100 // optional, mg/dL
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "vital": {
        "_id": "mongo_id",
        "patientId": "user_id",
        "heartRate": 80,
        "bloodPressure": { "systolic": 120, "diastolic": 80 },
        "glucose": 100,
        "timestamp": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Vitals submitted"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 400: Invalid input (e.g., negative heartRate)
  - 500: Server error

##### Get Vitals History
- **Method**: GET
- **Endpoint**: `/vitals/:patientId`
- **Description**: Retrieves vitals history with optional date filters.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `startDate`: Optional, e.g., `2025-05-01T00:00:00Z`
  - `endDate`: Optional, e.g., `2025-05-15T23:59:59Z`
  - `page`: Optional, default `1`
  - `limit`: Optional, default `10`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "vitals": [
        {
          "_id": "mongo_id",
          "patientId": "user_id",
          "heartRate": 80,
          "bloodPressure": { "systolic": 120, "diastolic": 80 },
          "glucose": 100,
          "timestamp": "2025-05-15T10:17:00Z"
        }
      ],
      "total": 50,
      "page": 1,
      "pages": 5
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-patient/doctor)
  - 400: Invalid query
  - 404: Patient not found
  - 500: Server error

##### Get Single Vital Entry
- **Method**: GET
- **Endpoint**: `/vitals/single/:id`
- **Description**: Retrieves a single vital entry.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "vital": {
        "_id": "mongo_id",
        "patientId": "user_id",
        "heartRate": 80,
        "bloodPressure": { "systolic": 120, "diastolic": 80 },
        "glucose": 100,
        "timestamp": "2025-05-15T10:17:00Z"
      }
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Vital not found
  - 500: Server error

##### Update Vital Entry
- **Method**: PUT
- **Endpoint**: `/vitals/:id`
- **Description**: Updates a vital entry.
- **Access**: Patient
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "heartRate": 85, // optional
    "bloodPressure": { // optional
      "systolic": 125,
      "diastolic": 85
    },
    "glucose": 105 // optional
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "vital": {
        "_id": "mongo_id",
        "patientId": "user_id",
        "heartRate": 85,
        "bloodPressure": { "systolic": 125, "diastolic": 85 },
        "glucose": 105,
        "timestamp": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Vital updated"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-patient)
  - 400: Invalid input
  - 404: Vital not found
  - 500: Server error

##### Delete Vital Entry
- **Method**: DELETE
- **Endpoint**: `/vitals/:id`
- **Description**: Deletes a vital entry.
- **Access**: Patient
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Vital deleted"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Vital not found
  - 500: Server error

### 3. Appointment Module
Manages appointment scheduling with Socket.io notifications.

#### Endpoints

##### Create Appointment
- **Method**: POST
- **Endpoint**: `/appointments`
- **Description**: Creates an appointment, triggers Socket.io notification.
- **Access**: Patient
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "doctorId": "mongo_id",
    "date": "2025-05-16T14:00:00Z"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "appointment": {
        "_id": "mongo_id",
        "patientId": "user_id",
        "doctorId": "mongo_id",
        "date": "2025-05-16T14:00:00Z",
        "status": "pending",
        "createdAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Appointment created"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 400: Invalid input (e.g., past date)
  - 404: Doctor not found
  - 500: Server error

##### List Appointments
- **Method**: GET
- **Endpoint**: `/appointments/:userId`
- **Description**: Lists appointments for a user with optional filters.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status`: Optional, e.g., `pending`
  - `startDate`: Optional, e.g., `2025-05-01T00:00:00Z`
  - `endDate`: Optional, e.g., `2025-05-31T23:59:59Z`
  - `page`: Optional, default `1`
  - `limit`: Optional, default `10`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "appointments": [
        {
          "_id": "mongo_id",
          "patientId": "user_id",
          "doctorId": "mongo_id",
          "date": "2025-05-16T14:00:00Z",
          "status": "pending",
          "createdAt": "2025-05-15T10:17:00Z"
        }
      ],
      "total": 20,
      "page": 1,
      "pages": 2
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-patient/doctor)
  - 400: Invalid query
  - 404: User not found
  - 500: Server error

##### Update Appointment Status
- **Method**: PUT
- **Endpoint**: `/appointments/:id`
- **Description**: Updates appointment status, triggers Socket.io notification.
- **Access**: Doctor
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "status": "confirmed" | "cancelled"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "appointment": {
        "_id": "mongo_id",
        "patientId": "user_id",
        "doctorId": "mongo_id",
        "date": "2025-05-16T14:00:00Z",
        "status": "confirmed",
        "createdAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Appointment updated"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-doctor)
  - 400: Invalid status
  - 404: Appointment not found
  - 500: Server error

##### Cancel Appointment
- **Method**: DELETE
- **Endpoint**: `/appointments/:id`
- **Description**: Cancels an appointment, triggers Socket.io notification.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Appointment cancelled"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Appointment not found
  - 500: Server error

### 4. Chat Module
Manages real-time chat history, with messages persisted in MongoDB and sent via Socket.io.

#### Endpoints

##### Get Chat History
- **Method**: GET
- **Endpoint**: `/chats/:userId`
- **Description**: Retrieves chat history with another user.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `otherUserId`: Required, e.g., `mongo_id`
  - `page`: Optional, default `1`
  - `limit`: Optional, default `20`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "messages": [
        {
          "_id": "mongo_id",
          "from": "user_id",
          "to": "other_user_id",
          "content": "Hello",
          "timestamp": "2025-05-15T10:17:00Z"
        }
      ],
      "total": 100,
      "page": 1,
      "pages": 5
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-patient/doctor)
  - 400: Invalid query
  - 404: User not found
  - 500: Server error

##### Send Message
- **Method**: POST
- **Endpoint**: `/chats`
- **Description**: Sends a message, persists in MongoDB, broadcasts via Socket.io.
- **Access**: Patient, Doctor
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "toUserId": "mongo_id",
    "content": "Hello, how are you?"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "message": {
        "_id": "mongo_id",
        "from": "user_id",
        "to": "mongo_id",
        "content": "Hello, how are you?",
        "timestamp": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Message sent"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 400: Invalid input
  - 404: Recipient not found
  - 500: Server error

### 5. Analytics Module
Provides vital trends and generates reports stored in Firebase Storage.

#### Endpoints

##### Get Vital Trends
- **Method**: GET
- **Endpoint**: `/analytics/:patientId`
- **Description**: Retrieves vital trends for a patient.
- **Access**: Patient, Doctor
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `startDate`: Required, e.g., `2025-05-01T00:00:00Z`
  - `endDate`: Required, e.g., `2025-05-15T23:59:59Z`
  - `metric`: Required, e.g., `heartRate` | `bloodPressure` | `glucose`
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "trends": [
        {
          "metric": "heartRate",
          "value": 80,
          "timestamp": "2025-05-15T10:17:00Z"
        }
      ],
      "summary": {
        "avg": 82,
        "min": 70,
        "max": 90
      }
    },
    "message": null
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden
  - 400: Invalid metric or dates
  - 404: Patient not found
  - 500: Server error

##### Generate Health Report
- **Method**: POST
- **Endpoint**: `/analytics/report`
- **Description**: Generates a health report PDF, stores in Firebase Storage.
- **Access**: Doctor
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "patientId": "mongo_id",
    "startDate": "2025-05-01T00:00:00Z",
    "endDate": "2025-05-15T23:59:59Z"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "success",
    "data": {
      "report": {
        "url": "https://storage.googleapis.com/.../report.pdf",
        "fileName": "report_20250515.pdf",
        "uploadedAt": "2025-05-15T10:17:00Z"
      }
    },
    "message": "Report generated"
  }
  ```
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (non-doctor)
  - 400: Invalid input
  - 404: Patient not found
  - 500: Server error

## Notes
- **Socket.io**: Used for real-time notifications in Vitals, Appointments, and Chat modules.
- **Pagination**: Supported in list endpoints with `page` and `limit` query parameters.
- **MongoDB**: Stores user data, vitals, appointments, and chat history.
- **Firebase Storage**: Stores generated health report PDFs.