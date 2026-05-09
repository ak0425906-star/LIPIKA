# LIPIKA: Comprehensive Technical Deep-Dive & Viva Guide

This document provides an exhaustive explanation of the principles, methods, and algorithms implemented in the LIPIKA project. Use this to prepare for technical interviews and presentations.

---

## 1. Core Architectural Principle: Decoupled Full-Stack Design
LIPIKA follows a **Client-Server Architecture** with a clear separation of concerns:
*   **Frontend**: A Single Page Application (SPA) built with React. It handles the Presentation Layer and User Experience (UX).
*   **Backend**: A RESTful API built with FastAPI. It handles the Logic Layer, Authentication, and Data Persistence.
*   **AI Engine**: A separate microservice (Hugging Face Spaces) that handles the Computationally Intensive ML inference.

**Why this matters for Viva**: This architecture allows for **Scalability**. We can upgrade the AI model or the database without rewriting the entire frontend.

---

## 2. Advanced Machine Learning: Siamese Neural Networks (SNN)
The handwriting verification is powered by a **Siamese Neural Network**.

### The Principle
Unlike standard classification models (which identify "What is in this image?"), a Siamese network asks "How similar are these two images?".
*   **Twin Sub-networks**: It uses two identical neural networks with shared weights.
*   **Feature Embeddings**: Each image is converted into a high-dimensional vector (an embedding).
*   **Distance Metric**: The system calculates the **Cosine Similarity** or **Euclidean Distance** between these two vectors. If the vectors are close in space, the handwritings are similar.

### The Training Method
The model was likely trained using **Triplet Loss**. It takes three images:
1.  **Anchor** (A student's sample)
2.  **Positive** (Another sample from the same student)
3.  **Negative** (A sample from a different student)
The network learns to minimize the distance between Anchor-Positive and maximize the distance between Anchor-Negative.

---

## 3. The "Dynamic Calibration" Algorithm (Critical Viva Point)
During testing, we discovered that raw ML models often give **False Positives** (~95% similarity for different writers) because they see general features (black lines on white paper).

### The Mathematical Solution
We implemented a **Steep Power Transformation** to "stretch" the sensitivity in the critical 90-100% range.

**Algorithm Formula**:  
`calibrated_score = (raw_score / 100)^10 * 100`

### Step-by-Step Logic:
1.  **Normalization**: Divide the 0-100 score by 100 to get a value between 0 and 1 (e.g., 0.95).
2.  **Exponentiation**: Raise it to the power of 10. 
    *   $0.95^{10} \approx 0.59$ (Massive drop for false positives)
    *   $0.99^{10} \approx 0.90$ (High confidence match remains high)
    *   $1.0^{10} = 1.0$ (Perfect match remains perfect)
3.  **Rescaling**: Multiply back by 100 to get the final percentage.

**Result**: This algorithm makes the system **extremely sensitive** to small differences in strokes, loops, and handwriting pressure.

---

## 4. Backend Methods & Principles

### A. Asynchronous Programming (Python `async/await`)
FastAPI uses an **Event Loop**. This is crucial because calling an external ML API takes time (1-3 seconds). Using `async` allows the server to handle other requests while waiting for the ML result, preventing "Blocking."

### B. JWT Authentication (JSON Web Tokens)
Instead of storing session IDs in the database, we use **Stateless JWTs**.
1.  User logs in $\rightarrow$ Server signs a token with a `Secret Key`.
2.  The token contains the user's role and username (the payload).
3.  For every subsequent request, the student sends this token. The server verifies the signature. This is faster and more secure than traditional sessions.

### C. Database Normalization (SQLAlchemy ORM)
We use **Relational Mapping** to maintain data integrity:
*   **One-to-Many**: One student has many assignments.
*   **Many-to-Many**: Many teachers can teach many subjects (handled via a junction table `teacher_subjects`).
*   **Referential Integrity**: If a student is deleted, their assignments are also cleared to prevent "Orphaned Data."

---

## 5. Frontend Principles (React/Vite)

### A. Component-Based Architecture
The UI is broken into reusable components (Buttons, Cards, Modals). This follows the **DRY (Don't Repeat Yourself)** principle.

### B. State Management (`useState`, `useEffect`)
*   **Local State**: Managing if a modal is open or what text is in a search bar.
*   **Side Effects (`useEffect`)**: Fetching data from the API as soon as a dashboard loads.
*   **Memoization (`useMemo`)**: We use `useMemo` for calculating statistics (like the count of Strong/Weak matches). This prevents the UI from lagging by ensuring calculations only run when the data actually changes.

### C. Declarative UI
Instead of telling the browser *how* to change the pixels (Imperative), we describe *what* the UI should look like based on the current state (Declarative). If `similarity < 60`, React automatically knows to render the Red "Weak Match" badge.

---

## 6. Security Principles implemented
1.  **Input Sanitization**: Using **Pydantic** models in FastAPI to ensure students can't send malicious data.
2.  **Role-Based Access Control (RBAC)**: A student cannot call `/admin/students` endpoints because the backend verifies the role inside the JWT before execution.
3.  **File Security**: Every uploaded file is renamed with a **UUID** (Universally Unique Identifier) to prevent "Filename Collision" and "Directory Traversal" attacks.

---

## 🚀 Quick Viva Summary Table
| Concept | Method/Algorithm | Benefit |
| :--- | :--- | :--- |
| **Verification** | Siamese Network + Triplet Loss | Focuses on similarity rather than classification. |
| **Accuracy** | Power-of-10 Calibration | Eliminates false positives by stretching the score range. |
| **Performance** | Async/Await + Vite | Ensures smooth user experience with zero lag. |
| **Security** | JWT + RBAC | Protects sensitive student data and prevents unauthorized access. |
| **Integrity** | Minimum Score Selection | Ensures a submission is compared against all known references. |
