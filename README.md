# TravelHub

A modern, full-featured travel booking platform built with Django 5.2, featuring multi-language support, AI-powered recommendations, and a comprehensive booking system.

## 🚀 Features

### Core Functionality
- **Multi-language Support**: English, Uzbek, Russian with django-modeltranslation
- **User Authentication**: Google OAuth integration, custom user model
- **Destination Management**: Comprehensive travel destination catalog with categories, tags, and activities
- **Booking System**: Full booking lifecycle with payment integration, cancellation policies, and time slots
- **Reviews & Ratings**: Multi-criteria rating system (staff, location, cleanliness, facilities, value)
- **Wishlist**: Save favorite destinations for later
- **Trip Planning**: Plan and organize trips with AI assistance

### Advanced Features
- **AI-Powered Recommendations**: Google Generative AI integration for personalized travel suggestions
- **AI Moderation**: Automated content moderation for reviews and user-generated content
- **Price Alerts**: Notify users when destination prices drop
- **Promo Codes**: Discount code system for marketing campaigns
- **Notifications**: In-app, email, and push notification system
- **Real-time Updates**: Celery-based background tasks with Redis
- **Geolocation**: Country, region, and city management with geopy integration

### Admin & Management
- **Modern Admin Panel**: Django Jazzmin with custom styling
- **Rich Text Editor**: CKEditor 5 for content management
- **Translation Management**: Django Rosetta for easy translations
- **Audit Logging**: Comprehensive action logging for security and compliance
- **Celery Monitoring**: Flower for task monitoring

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.2.8
- **Language**: Python 3.13+
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Task Queue**: Celery with django-celery-beat and django-celery-results
- **WSGI Server**: Gunicorn
- **Static Files**: WhiteNoise

### Frontend
- **Template Engine**: Django Templates
- **Rich Text**: CKEditor 5
- **Admin UI**: Django Jazzmin

### Integrations
- **AI**: Google Generative AI
- **OAuth**: Google Authentication
- **Geolocation**: Geopy
- **Phone Validation**: Phonenumbers
- **Email**: SMTP backend

### Development Tools
- **Code Quality**: Flake8, isort
- **Debugging**: Django Debug Toolbar
- **Containerization**: Docker, Docker Compose
- **Environment Management**: python-dotenv

## 📋 Prerequisites

- Python 3.13 or higher
- PostgreSQL 12+
- Redis 6+
- Node.js (for asset management, if needed)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd travelhub
```

### 2. Create Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -e .
```

Or using uv (recommended):

```bash
uv sync
```

### 4. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/travelhub
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
GEMINI_API_KEY=your-gemini-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_PORT=587
EMAIL_USE_SSL=True
```

### 5. Database Setup

```bash
python manage.py migrate
```

### 6. Seed Initial Data

```bash
python manage.py seed_countries
python manage.py seed_destinations
python manage.py seed_uzbekistan
```

### 7. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 8. Create Superuser

```bash
python manage.py createsuperuser
```

### 9. Run Development Server

```bash
python manage.py runserver
```

The application will be available at `http://localhost:8000`

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Build and Run with Docker

```bash
docker build -t travelhub .
docker run -p 8000:8000 --env-file .env.local travelhub
```

## 📁 Project Structure

```
travelhub/
├── apps/                    # Main application directory
│   ├── models/             # Django models (modular structure)
│   │   ├── base.py         # Base models
│   │   ├── users.py        # User model
│   │   ├── destinations.py # Destination models
│   │   ├── orders.py       # Booking/Order models
│   │   ├── reviews.py      # Review models
│   │   ├── notifications.py # Notification models
│   │   └── ...
│   ├── views/              # View functions
│   ├── services/           # Business logic
│   ├── management/         # Django management commands
│   ├── static/             # Static files
│   └── templates/          # HTML templates
├── root/                   # Project configuration
│   ├── settings.py         # Django settings
│   ├── urls.py             # URL configuration
│   └── wsgi.py             # WSGI configuration
├── locale/                 # Translation files
├── media/                  # User uploaded files
├── staticfiles/            # Collected static files
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
├── pyproject.toml          # Project dependencies
└── manage.py               # Django management script
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Django secret key | Yes |
| `DEBUG` | Debug mode (True/False) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |
| `GEMINI_API_KEY` | Google Generative AI API key | No |
| `EMAIL_HOST` | SMTP server host | No |
| `EMAIL_HOST_USER` | SMTP username | No |
| `EMAIL_HOST_PASSWORD` | SMTP password | No |

## 🌐 Multi-language Setup

The project supports English, Uzbek, and Russian. To add or modify translations:

```bash
# Create translation files
python manage.py makemessages

# Compile translations
python manage.py compilemessages

# Use Django Rosetta for web-based translation
# Access at /rosetta/
```

## 🧪 Running Tests

```bash
python manage.py test
```

## 📊 Celery Tasks

Start Celery worker:

```bash
celery -A root worker -l info
```

Start Celery beat scheduler:

```bash
celery -A root beat -l info
```

Monitor with Flower:

```bash
celery -A root flower
```

## 🚢 Deployment

### Railway

The project is configured for Railway deployment. Set the required environment variables in Railway dashboard and deploy.

### Manual Production Deployment

1. Set `DEBUG=False` in environment
2. Configure `ALLOWED_HOSTS`
3. Use production database
4. Configure static files serving
5. Set up SSL certificates
6. Configure Celery for production

## 📝 Available Management Commands

- `seed_countries` - Seed countries data
- `seed_destinations` - Seed destinations data
- `seed_uzbekistan` - Seed Uzbekistan-specific data
- `auto_translate` - Auto-translate content
- `map_locations` - Map locations to coordinates
- `fill_django_po` - Fill Django translation files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Manas Sarsenov** - Project Lead

## 📞 Support

For support, email support@travelhub.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Mobile app development
- [ ] Payment gateway integration (Stripe, PayPal)
- [ ] Real-time chat support
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Loyalty program integration
