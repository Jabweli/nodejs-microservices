# 🌐 Node.js Social Media App – Microservices Architecture

This is a scalable, microservices-based **Node.js social media application** built with modular design principles. The app is split into independent services, each responsible for a specific domain functionality.

## 🧱 Microservices Included

### 🔐 `auth-service`
Handles user registration, login, logout, and authentication via JWT.

### 📝 `post-service`
Manages creation, reading, updating, and deleting of posts (CRUD). Integrates with `auth-service` for user validation.

### 📸 `media-service`
Handles media uploads (images/videos), storage, and retrieval. Can integrate with cloud services like AWS S3 or Cloudinary.

### 🔍 `search-service`
Provides searching functionality across posts and user profiles using keyword-based matching.

---

## 📦 Tech Stack

- **Node.js** & **Express.js**
- **MongoDB** (per service database)
- **RabbitMQ / Redis** (inter-service communication)
- **Docker** (for containerization)
- **JWT** (for authentication)
- **Multer / Cloudinary (for media handling)

---

