# PolicyPal - Insurance Management System

A comprehensive insurance management system built with React, TypeScript, and Azure SQL Database.

## Features

- **Multi-Insurance Support**: Auto, Health, Term Life, Savings Plans, Home Insurance
- **AI-Powered Chat**: LLM integration for personalized insurance recommendations
- **Azure SQL Database**: Robust data storage with 35+ insurance products
- **Dynamic Forms**: Context-aware forms based on insurance type
- **Real-time Chat**: Conversation history and customer data management

## Environment Setup

Create a `.env` file with the following variables:

```env
# LLM Configuration
VITE_LLM_ENDPOINT=your_llm_endpoint
VITE_LLM_SUBSCRIPTION_KEY=your_subscription_key
VITE_LLM_DEPLOYMENT_NAME=your_deployment_name
VITE_LLM_MODEL_NAME=your_model_name
VITE_LLM_API_VERSION=your_api_version

# Azure SQL Database
AZURE_SQL_SERVER=db.database.windows.net
AZURE_SQL_DATABASE=PolicyPalDB
AZURE_SQL_USERNAME=admin001
AZURE_SQL_PASSWORD=admin231
```

## Database Setup

1. Create an Azure SQL Database
2. Run the complete setup script: `azure-sql/setup-database.sql`
3. This will create tables and insert 35 diversified insurance products

## Installation

```bash
npm install
npm run dev:full
```

## Deployment

This app is designed for deployment on Azure Static Web Apps with environment variables configured in the Azure portal.
