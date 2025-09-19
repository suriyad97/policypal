# PolicyPal - Insurance Management System

A comprehensive insurance management system built with React, TypeScript, and Python FastAPI.

## Features

- **Multi-Insurance Support**: Auto, Health, Term Life, Savings Plans, Home Insurance
- **AI-Powered Chat**: LLM integration for personalized insurance recommendations

- **Dynamic Forms**: Context-aware forms based on insurance type
- **Real-time Chat**: Conversation history and customer data management
- **Python Backend**: FastAPI server with async database operations
- **Dual Backend Support**: Both Node.js and Python backend options


## Python Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd python-server
   pip install -r requirements.txt
   ```



## Installation

**Option 1: Node.js Backend**
```bash
npm install
npm run dev:node
```

**Option 2: Python Backend**
```bash
npm install
cd python-server && pip install -r requirements.txt
cd ..
npm run dev:python
```

## API Documentation

When using the Python backend, visit `http://localhost:5000/docs` for interactive API documentation.

## Deployment

This app supports deployment on:
- **Frontend**: Azure Static Web Apps, Vercel, Netlify
- **Python Backend**: Azure App Service, AWS Lambda, Google Cloud Run

