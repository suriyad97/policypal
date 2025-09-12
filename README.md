# PolicyPal - Insurance Management System

A comprehensive insurance management system built with React, TypeScript, Python FastAPI, and Azure SQL Database.

## Features

- **Multi-Insurance Support**: Auto, Health, Term Life, Savings Plans, Home Insurance
- **AI-Powered Chat**: LLM integration for personalized insurance recommendations
- **Azure SQL Database**: Robust data storage with 35+ insurance products
- **Dynamic Forms**: Context-aware forms based on insurance type
- **Real-time Chat**: Conversation history and customer data management
- **Python Backend**: FastAPI server with async database operations
- **Dual Backend Support**: Both Node.js and Python backend options

## Environment Setup

Create a `.env` file with the following variables:

```env
# LLM Configuration
LLM_ENDPOINT=your_llm_endpoint
LLM_SUBSCRIPTION_KEY=your_subscription_key
LLM_DEPLOYMENT_NAME=your_deployment_name
LLM_MODEL_NAME=your_model_name
LLM_API_VERSION=your_api_version

# Azure SQL Database
AZURE_SQL_SERVER=tcp:ml-lms-db.database.windows.net
AZURE_SQL_DATABASE=lms-db
AZURE_SQL_USERNAME=lmsadmin-001
AZURE_SQL_PASSWORD=Creative@2025
```

## Python Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd python-server
   pip install -r requirements.txt
   ```

2. **Install ODBC Driver for SQL Server:**
   - **Windows**: Download from Microsoft
   - **macOS**: `brew install msodbcsql18 mssql-tools18`
   - **Linux**: Follow Microsoft's installation guide

## Database Setup

1. Create an Azure SQL Database
2. Run the complete setup script: `azure-sql/setup-database.sql`
3. This will create tables and insert 35 diversified insurance products

## Installation

**Option 1: Node.js Backend**
```bash
npm install
npm run dev:full
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
- **Database**: Azure SQL Database
