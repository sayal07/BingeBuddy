#  BingeBuddy — Watch Together, Stay Together

A real-time synchronized watch party web application built as a Final Year Project (CS6PO5NT).

## Features

- **Real-Time Video Sync** — WebSocket-based Play/Pause/Seek synchronization
- **Private Rooms** — 8-digit alphanumeric codes for secure room access
- **Live Chat** — In-room messaging with emoji reactions and typing indicators
- **Host Controls** — Kick, mute, lock room, and control playback
- **OTP Authentication** — Secure email verification via Gmail SMTP
- **JWT Sessions** — Token-based authentication with auto-refresh
- **Dark/Light Mode** — Cinematic dark theme with toggle
- **Responsive Design** — Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS |
| Backend | Django REST Framework |
| Real-Time | Django Channels, WebSockets |
| Database | MongoDB (via Djongo) |
| Cache/Queue | Redis |
| Auth | JWT (SimpleJWT) + Gmail OTP |

## Project Structure

```
BingeBuddy/
├── backend/
│   ├── bingebuddy/          # Django project config
│   │   ├── settings.py      # All settings (DB, JWT, SMTP, Channels)
│   │   ├── asgi.py          # ASGI + WebSocket routing
│   │   └── urls.py          # Root URL config
│   ├── accounts/            # Auth: signup, OTP, login, profile
│   ├── rooms/               # Rooms: CRUD, sync consumers
│   ├── chat/                # Chat: messages, WebSocket consumer
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, VideoPlayer, ChatBox, etc.
│   │   ├── pages/           # Landing, Login, Dashboard, WatchRoom, etc.
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── hooks/           # useWebSocket
│   │   ├── services/        # Axios API, auth functions
│   │   └── App.js           # Main app with routing
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Redis

## Setup Instructions

### 1. Clone & Environment

```bash
git clone <repo-url>
cd BingeBuddy
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB, Redis, Gmail SMTP credentials

# Run migrations
python manage.py makemigrations accounts rooms chat
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run the server (use Daphne for WebSocket support)
daphne -b 0.0.0.0 -p 8000 bingebuddy.asgi:application
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

The frontend runs at `http://localhost:3000` and the backend at `http://localhost:8000`.

### 4. Redis

Make sure Redis is running locally:

```bash
redis-server
```

## Gmail SMTP Setup

1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Generate an app password for "Mail"
3. Add to `.env`:
   ```
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-16-char-app-password
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup/` | Register |
| POST | `/api/auth/verify-otp/` | Verify OTP |
| POST | `/api/auth/resend-otp/` | Resend OTP |
| POST | `/api/auth/login/` | Login (JWT) |
| POST | `/api/auth/logout/` | Logout |
| GET/PATCH | `/api/auth/profile/` | Profile |
| POST | `/api/auth/change-password/` | Change password |
| POST | `/api/rooms/create/` | Create room |
| POST | `/api/rooms/join/` | Join room |
| GET | `/api/rooms/:code/` | Room details |
| POST | `/api/rooms/:code/leave/` | Leave room |
| POST | `/api/rooms/:code/kick/` | Kick user (host) |
| POST | `/api/rooms/:code/mute/` | Mute user (host) |
| POST | `/api/rooms/:code/lock/` | Lock room (host) |
| POST | `/api/rooms/:code/video/` | Change video (host) |
| GET | `/api/chat/:code/history/` | Chat history |

## WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `ws/room/:code/sync/` | Video playback sync |
| `ws/room/:code/chat/` | Real-time chat |

## Developer

**Sayal Dangal** — Itahari International College / London Metropolitan University
- London Met ID: 23049995
- Supervisor: Mr. Binay Koirala

## License

This project is developed for academic purposes as part of CS6PO5NT Final Year Project.
