# LIPIKA — Test Cases Document

## Project: LIPIKA — AI-Powered Handwriting Verification System
**Module**: Full Application Testing  
**Prepared By**: ak0425906  
**Date**: May 2026

---

## 1. User Registration (Signup) Test Cases

| TC ID | Test Case Description | Pre-Condition | Test Steps | Test Data | Expected Result | Status |
|-------|----------------------|---------------|------------|-----------|-----------------|--------|
| TC_01 | Successful student registration | Application is running, user is on Create Account page | 1. Enter full name 2. Enter username 3. Enter roll number 4. Enter password 5. Enter department 6. Select role as "Student" 7. Click "Create Account" | Name: Rahul Kumar, Username: rahul01, Roll No: 21CS101, Password: Test@123, Department: CSE, Role: Student | Account is created successfully. User is redirected to Student Dashboard. Toast shows "Welcome, Rahul Kumar!" | |
| TC_02 | Successful teacher registration | Application is running, user is on Create Account page | 1. Enter full name 2. Enter username 3. Enter roll number 4. Enter password 5. Enter department 6. Select role as "Teacher" 7. Click "Create Account" | Name: Dr. Priya Singh, Username: priya.teacher, Roll No: TCH001, Password: Teach@456, Department: CSE, Role: Teacher | Account is created successfully. User is redirected to Teacher Dashboard | |
| TC_03 | Successful admin registration | Application is running, user is on Create Account page | 1. Fill all fields 2. Select role as "Admin" 3. Click "Create Account" | Name: Admin User, Username: admin01, Roll No: ADM001, Password: Admin@789, Department: Administration, Role: Admin | Account is created successfully. User is redirected to Admin Dashboard | |
| TC_04 | Registration with missing fields | User is on Create Account page | 1. Leave the "Full Name" field empty 2. Fill all other fields 3. Click "Create Account" | Name: (empty), Username: testuser, Roll No: 21CS102, Password: Pass@123, Department: CSE, Role: Student | Error toast appears: "Please fill in all fields" — account is NOT created | |
| TC_05 | Registration with duplicate username | A user with username "rahul01" already exists | 1. Fill all fields with an existing username 2. Click "Create Account" | Username: rahul01 (already registered) | Error toast appears: "Username already registered" — duplicate account is NOT created | |
| TC_06 | Registration with all fields empty | User is on Create Account page | 1. Click "Create Account" without filling any field | All fields empty | Error toast appears: "Please fill in all fields" | |

---

## 2. User Login Test Cases

| TC ID | Test Case Description | Pre-Condition | Test Steps | Test Data | Expected Result | Status |
|-------|----------------------|---------------|------------|-----------|-----------------|--------|
| TC_07 | Successful student login with username | Student account "rahul01" exists | 1. Enter username 2. Enter password 3. Select role as "Student" 4. Click "Sign In" | Username: rahul01, Password: Test@123, Role: Student | Login successful. User is redirected to Student Dashboard. JWT token is stored in localStorage | |
| TC_08 | Successful login with roll number | Student account with roll number "21CS101" exists | 1. Enter roll number as username 2. Enter password 3. Select role as "Student" 4. Click "Sign In" | Username: 21CS101, Password: Test@123, Role: Student | Login successful. User is redirected to Student Dashboard | |
| TC_09 | Login with wrong password | Student account exists | 1. Enter correct username 2. Enter wrong password 3. Select correct role 4. Click "Sign In" | Username: rahul01, Password: WrongPass, Role: Student | Error toast: "Invalid credentials or incorrect role selected" — login denied | |
| TC_10 | Login with wrong role | Student account exists but user selects "Teacher" role | 1. Enter student username 2. Enter correct password 3. Select "Teacher" role 4. Click "Sign In" | Username: rahul01, Password: Test@123, Role: Teacher | Error toast: "Invalid credentials or incorrect role selected" — login denied even with correct password | |
| TC_11 | Login with non-existent user | No account with given username | 1. Enter non-existent username 2. Enter any password 3. Select any role 4. Click "Sign In" | Username: ghost_user, Password: any123, Role: Student | Error toast: "Invalid credentials or incorrect role selected" | |
| TC_12 | Login with empty fields | User is on Login page | 1. Leave all fields empty 2. Click "Sign In" | All fields empty | Error toast: "Please fill in all fields and select a role" | |
| TC_13 | Teacher login redirects to Teacher Dashboard | Teacher account exists | 1. Enter teacher credentials 2. Select "Teacher" role 3. Click "Sign In" | Username: priya.teacher, Password: Teach@456, Role: Teacher | Login successful. User is redirected to `/teacher-dashboard` (NOT student dashboard) | |
| TC_14 | Admin login redirects to Admin Dashboard | Admin account exists | 1. Enter admin credentials 2. Select "Admin" role 3. Click "Sign In" | Username: admin01, Password: Admin@789, Role: Admin | Login successful. User is redirected to `/admin-dashboard` | |

---

## 3. Student — Assignment Upload & Handwriting Verification Test Cases

| TC ID | Test Case Description | Pre-Condition | Test Steps | Test Data | Expected Result | Status |
|-------|----------------------|---------------|------------|-----------|-----------------|--------|
| TC_15 | First assignment upload (reference sample) | Student is logged in, has NO previous uploads | 1. Navigate to Upload Assignment page 2. Select a handwriting image 3. Click "Upload" | File: handwriting_sample_1.jpg (valid image) | Upload succeeds. Response: "First submission: Reference handwriting saved." Similarity score = 100.0, Match type = "Reference" | |
| TC_16 | Second assignment upload (comparison) | Student is logged in, reference sample already exists | 1. Navigate to Upload Assignment page 2. Select a new handwriting image 3. Click "Upload" | File: handwriting_sample_2.jpg (same student's writing) | Upload succeeds. Response: "Handwriting verification complete." Returns a similarity score (e.g., 87.5) and match type (e.g., "Strong Match") | |
| TC_17 | Upload assignment with different person's handwriting | Student has reference sample saved | 1. Upload an image written by a different person | File: different_person_handwriting.jpg | Upload succeeds. Similarity score should be LOW (< 60%). Match type = "Weak Match" | |
| TC_18 | Upload non-image file | Student is logged in | 1. Try to select a non-image file (e.g., .pdf, .txt) | File: document.pdf | The file picker only allows image files. Non-image files cannot be selected | |
| TC_19 | Upload multiple images at once | Student is logged in | 1. Select multiple images 2. Preview them 3. Click "Upload" | Files: img1.jpg, img2.jpg, img3.jpg | All images are shown in preview grid. Each file is uploaded individually to the backend | |
| TC_20 | Remove image before uploading | Student has selected images for upload | 1. Select an image 2. Hover over it 3. Click the X (remove) button | Any image file | Image is removed from the preview. It will NOT be uploaded | |

---

## 4. Teacher Dashboard Test Cases

| TC ID | Test Case Description | Pre-Condition | Test Steps | Test Data | Expected Result | Status |
|-------|----------------------|---------------|------------|-----------|-----------------|--------|
| TC_21 | View all student submissions | Teacher is logged in, students have submitted assignments | 1. Login as Teacher 2. Navigate to Teacher Dashboard | N/A | Dashboard displays a list of all student submissions with: Student Name, Roll Number, Similarity Score, Match Type, Date, and Handwriting Image | |
| TC_22 | Verify similarity scores are displayed correctly | Submissions exist with various scores | 1. View Teacher Dashboard 2. Check similarity values | N/A | Scores ≥ 85 show "Strong Match" (green), 60-84 show "Moderate Match" (yellow), < 60 show "Weak Match" (red) | |
| TC_23 | Teacher cannot access Student Dashboard | Teacher is logged in | 1. Manually navigate to `/student-dashboard` URL | N/A | Access is denied or user is redirected — teacher role cannot access student-only features | |
| TC_24 | Empty dashboard when no submissions | Teacher is logged in, no students have submitted | 1. Login as Teacher 2. View Dashboard | N/A | Dashboard shows an empty state or "No submissions yet" message | |

---

## 5. Admin Dashboard Test Cases

| TC ID | Test Case Description | Pre-Condition | Test Steps | Test Data | Expected Result | Status |
|-------|----------------------|---------------|------------|-----------|-----------------|--------|
| TC_25 | View all registered students | Admin is logged in, students exist in database | 1. Login as Admin 2. Navigate to Admin Dashboard | N/A | Dashboard shows list of all students with: Name, Email/Username, Roll Number, Department, Year | |
| TC_26 | Upload training data for a student | Admin is logged in, student with roll "21CS101" exists | 1. Enter roll number "21CS101" 2. Select a handwriting image 3. Click Upload | Roll Number: 21CS101, File: training_sample.jpg | Success message: "Training data added for Rahul Kumar". File is saved under `training_data/student_{id}/` | |
| TC_27 | Upload training data for non-existent roll number | Admin is logged in | 1. Enter a roll number that doesn't exist 2. Upload a file | Roll Number: 99XX999, File: any_image.jpg | Error: "Student roll number not found" — upload is rejected | |
| TC_28 | Admin cannot access without login | User is not authenticated | 1. Directly navigate to `/admin-dashboard` in browser | N/A | Access denied — 401 Unauthorized error. User must log in first | |

---

## 6. API Endpoint Test Cases

| TC ID | Test Case Description | Method | Endpoint | Request Body | Expected Status | Expected Response |
|-------|----------------------|--------|----------|-------------|-----------------|-------------------|
| TC_29 | Health check | GET | `/` | N/A | 200 OK | `{"message": "Lipika Backend is active and running", "status": "online"}` |
| TC_30 | Signup with valid data | POST | `/signup` | `{"name": "Test User", "username": "testuser", "roll_number": "21CS999", "password": "Pass@123", "department": "CSE", "role": "student"}` | 200 OK | Returns user object with id, name, email, role |
| TC_31 | Signup with duplicate username | POST | `/signup` | Same username as TC_30 | 400 Bad Request | `{"detail": "Username already registered"}` |
| TC_32 | Login with valid credentials | POST | `/login` | `{"username": "testuser", "password": "Pass@123", "role": "student"}` | 200 OK | Returns `{"access_token": "...", "token_type": "bearer", "user": {...}}` |
| TC_33 | Login with invalid password | POST | `/login` | `{"username": "testuser", "password": "wrong", "role": "student"}` | 401 Unauthorized | `{"detail": "Invalid credentials or incorrect role selected"}` |
| TC_34 | Access protected route without token | GET | `/teacher/assignments` | No Authorization header | 401 Unauthorized | `{"detail": "Not authenticated"}` |
| TC_35 | Access protected route with wrong role | GET | `/teacher/assignments` | Valid student token in header | 403 Forbidden | `{"detail": "Access denied"}` |
| TC_36 | Upload assignment without auth | POST | `/upload-assignment` | File upload, no token | 401 Unauthorized | `{"detail": "Not authenticated"}` |

---

## 7. Security Test Cases

| TC ID | Test Case Description | Test Steps | Expected Result | Status |
|-------|----------------------|------------|-----------------|--------|
| TC_37 | Password is stored as hash, not plain text | 1. Register a new user 2. Check database | Password column in the `users` table contains a bcrypt hash (starts with `$2b$`), NOT the plain text password | |
| TC_38 | JWT token expires after 24 hours | 1. Login and save the token 2. Wait 24+ hours 3. Use the expired token | API returns 401 Unauthorized: "Could not validate credentials" | |
| TC_39 | Invalid JWT token is rejected | 1. Send a request with a tampered/fake JWT token | API returns 401 Unauthorized: "Could not validate credentials" | |
| TC_40 | SQL Injection prevention | 1. Enter `' OR 1=1 --` as username during login | Login fails normally — no data breach. SQLAlchemy ORM parameterizes all queries | |
| TC_41 | CORS allows frontend origin | 1. Make API request from frontend (localhost:5173) | Request succeeds — CORS headers allow the frontend origin | |

---

## 8. UI/UX Test Cases

| TC ID | Test Case Description | Test Steps | Expected Result | Status |
|-------|----------------------|------------|-----------------|--------|
| TC_42 | Password visibility toggle | 1. Type a password 2. Click the eye icon | Password switches between hidden (dots) and visible (plain text) | |
| TC_43 | Navigation from Login to Create Account | 1. On Login page, click "Create Account" button | User is navigated to `/create-account` page | |
| TC_44 | Navigation from Create Account to Login | 1. On Create Account page, click "Sign In" button | User is navigated to `/` (Login page) | |
| TC_45 | Loading state during login | 1. Click "Sign In" with valid credentials | Button text changes to "Signing In..." and button is disabled until API responds | |
| TC_46 | Loading state during signup | 1. Click "Create Account" with valid data | Button text changes to "Creating..." and button is disabled until API responds | |
| TC_47 | Page animations load smoothly | 1. Open Login page 2. Observe the UI | Logo, heading, and form card animate in with smooth fade and slide transitions (Framer Motion) | |
| TC_48 | Responsive design on mobile | 1. Open app on a mobile device or resize browser to 375px width | All forms, buttons, and dashboards are properly sized and usable on small screens | |

---

## Test Summary Table

| Test Category | Total Test Cases | 
|---------------|-----------------|
| User Registration (Signup) | 6 |
| User Login | 8 |
| Student — Upload & Verification | 6 |
| Teacher Dashboard | 4 |
| Admin Dashboard | 4 |
| API Endpoints | 8 |
| Security | 5 |
| UI/UX | 7 |
| **Total** | **48** |

---

## Handwriting Verification — Match Type Reference

| Score Range | Match Type | Interpretation |
|-------------|-----------|----------------|
| ≥ 85% | 🟢 Strong Match | Handwriting is very likely from the same student |
| 60% – 84% | 🟡 Moderate Match | Some similarities detected, needs manual review |
| < 60% | 🔴 Weak Match | Handwriting is likely from a different person |

---

> **Note**: All test cases assume the backend is connected to a valid PostgreSQL database (Neon.tech) and the Hugging Face ML model (`thanoxz/ml-api`) is active and responding.
