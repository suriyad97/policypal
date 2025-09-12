from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
import pyodbc
import os
import json
from datetime import datetime
import logging
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection string
def get_db_connection():
    try:
        server = os.getenv('AZURE_SQL_SERVER', 'tcp:ml-lms-db.database.windows.net')
        database = os.getenv('AZURE_SQL_DATABASE', 'lms-db')
        username = os.getenv('AZURE_SQL_USERNAME', 'lmsadmin-001')
        password = os.getenv('AZURE_SQL_PASSWORD', 'Creative@2025')
        
        # Remove tcp: prefix if present
        if server.startswith('tcp:'):
            server = server[4:]
        
        connection_string = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
        
        conn = pyodbc.connect(connection_string)
        logger.info("Database connection established successfully")
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Pydantic models
class CustomerData(BaseModel):
    name: str
    email: EmailStr
    phone: str
    age: Optional[int] = None
    gender: Optional[str] = None
    zip_code: str
    insurance_type: str
    vehicle_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[str] = None
    medical_history: Optional[str] = None
    coverage_amount: Optional[float] = None
    monthly_investment: Optional[float] = None
    investment_goal: Optional[str] = None
    current_provider: Optional[str] = None

    @validator('insurance_type')
    def validate_insurance_type(cls, v):
        # Map frontend values to database values
        type_mapping = {
            'car': 'auto',
            'term': 'term_life',
            'home': 'home',
            'health': 'health',
            'investment': 'investment'
        }
        return type_mapping.get(v, v)

    @validator('gender')
    def validate_gender(cls, v):
        if v:
            return v.lower()
        return v

    @validator('age')
    def validate_age(cls, v):
        if v is not None and (v < 18 or v > 80):
            raise ValueError('Age must be between 18 and 80')
        return v

class CustomerRequest(BaseModel):
    customerData: CustomerData

class ProductFilter(BaseModel):
    productType: str
    age: Optional[int] = None
    gender: Optional[str] = None

    @validator('productType')
    def validate_product_type(cls, v):
        # Map frontend values to database values
        type_mapping = {
            'car': 'auto',
            'term': 'term_life',
            'home': 'home',
            'health': 'health',
            'investment': 'investment'
        }
        return type_mapping.get(v, v)

    @validator('gender')
    def validate_gender(cls, v):
        if v:
            return v.lower()
        return v

class ChatInitialize(BaseModel):
    sessionId: str
    formData: Dict[str, Any]

class ChatMessage(BaseModel):
    sessionId: str
    message: str
    formData: Optional[Dict[str, Any]] = None

class ConversationEntry(BaseModel):
    customer_id: int
    session_id: str
    message: str
    response: str
    message_type: str = "user"

# FastAPI app
app = FastAPI(
    title="Insurance LMS API",
    description="Backend API for Insurance Learning Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (replace with Redis in production)
chat_sessions = {}

@app.get("/")
async def root():
    return {"message": "Insurance LMS Python Backend API", "status": "running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e), "timestamp": datetime.now().isoformat()}

@app.post("/api/database/products")
async def get_products(filter_data: ProductFilter):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Base query
        query = """
        SELECT product_id, product_name, product_type, description, 
               premium_amount, coverage_amount, min_age, max_age, 
               target_gender, is_active, created_at
        FROM insurance_products 
        WHERE is_active = 1 AND product_type = ?
        """
        params = [filter_data.productType]
        
        # Add age filter
        if filter_data.age:
            query += " AND min_age <= ? AND max_age >= ?"
            params.extend([filter_data.age, filter_data.age])
        
        # Add gender filter
        if filter_data.gender:
            query += " AND (target_gender = ? OR target_gender = 'all')"
            params.append(filter_data.gender)
        
        query += " ORDER BY premium_amount ASC"
        
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            product = dict(zip(columns, row))
            # Convert datetime to string
            if product.get('created_at'):
                product['created_at'] = product['created_at'].isoformat()
            results.append(product)
        
        conn.close()
        logger.info(f"Retrieved {len(results)} products for type: {filter_data.productType}")
        return {"products": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Error retrieving products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving products: {str(e)}")

@app.post("/api/database/customer")
async def store_customer(request: CustomerRequest):
    try:
        customer_data = request.customerData
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert customer data
        insert_query = """
        INSERT INTO customers (
            name, email, phone, age, gender, zip_code, insurance_type,
            vehicle_number, vehicle_model, vehicle_year, medical_history,
            coverage_amount, monthly_investment, investment_goal, current_provider,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        values = (
            customer_data.name,
            customer_data.email,
            customer_data.phone,
            customer_data.age,
            customer_data.gender,
            customer_data.zip_code,
            customer_data.insurance_type,
            customer_data.vehicle_number,
            customer_data.vehicle_model,
            customer_data.vehicle_year,
            customer_data.medical_history,
            customer_data.coverage_amount,
            customer_data.monthly_investment,
            customer_data.investment_goal,
            customer_data.current_provider,
            datetime.now()
        )
        
        cursor.execute(insert_query, values)
        customer_id = cursor.execute("SELECT @@IDENTITY").fetchone()[0]
        conn.commit()
        conn.close()
        
        logger.info(f"Customer stored successfully with ID: {customer_id}")
        return {
            "success": True,
            "customer_id": customer_id,
            "message": "Customer data stored successfully"
        }
        
    except Exception as e:
        logger.error(f"Error storing customer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error storing customer: {str(e)}")

@app.get("/api/database/customer/{customer_id}")
async def get_customer(customer_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM customers WHERE customer_id = ?", (customer_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        columns = [column[0] for column in cursor.description]
        customer = dict(zip(columns, row))
        
        # Convert datetime to string
        if customer.get('created_at'):
            customer['created_at'] = customer['created_at'].isoformat()
        
        conn.close()
        return {"customer": customer}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving customer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving customer: {str(e)}")

@app.post("/api/database/conversation")
async def store_conversation(conversation: ConversationEntry):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        insert_query = """
        INSERT INTO conversations (customer_id, session_id, message, response, message_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """
        
        cursor.execute(insert_query, (
            conversation.customer_id,
            conversation.session_id,
            conversation.message,
            conversation.response,
            conversation.message_type,
            datetime.now()
        ))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Conversation stored successfully"}
        
    except Exception as e:
        logger.error(f"Error storing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error storing conversation: {str(e)}")

@app.post("/api/chat/initialize")
async def initialize_chat(request: ChatInitialize):
    try:
        session_id = request.sessionId
        form_data = request.formData
        
        # Store session data
        chat_sessions[session_id] = {
            "form_data": form_data,
            "conversation_history": [],
            "created_at": datetime.now().isoformat()
        }
        
        # Generate welcome message based on insurance type
        insurance_type = form_data.get('insuranceType', 'general')
        name = form_data.get('name', 'there')
        
        welcome_messages = {
            'car': f"Hello {name}! I'm here to help you find the perfect auto insurance. I see you're interested in coverage for your vehicle. Let me help you explore your options!",
            'term': f"Hi {name}! I'm your term life insurance advisor. I'll help you find the right coverage to protect your family's financial future.",
            'home': f"Welcome {name}! I'm here to assist you with home insurance options to protect your property and belongings.",
            'health': f"Hello {name}! I'm your health insurance guide. Let's find the right coverage for your healthcare needs.",
            'investment': f"Hi {name}! I'm here to help you explore investment insurance options that can grow your wealth while providing protection."
        }
        
        # Map frontend values to backend values
        type_mapping = {
            'car': 'car',
            'term': 'term',
            'home': 'home',
            'health': 'health',
            'investment': 'investment'
        }
        
        mapped_type = type_mapping.get(insurance_type, 'general')
        welcome_message = welcome_messages.get(mapped_type, f"Hello {name}! I'm here to help you with your insurance needs.")
        
        logger.info(f"Chat initialized for session: {session_id}")
        return {
            "success": True,
            "sessionId": session_id,
            "message": welcome_message,
            "context": {
                "insurance_type": insurance_type,
                "customer_name": name
            }
        }
        
    except Exception as e:
        logger.error(f"Error initializing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error initializing chat: {str(e)}")

@app.post("/api/chat/message")
async def handle_chat_message(request: ChatMessage):
    try:
        session_id = request.sessionId
        message = request.message
        form_data = request.formData or {}
        
        # Get session data
        session = chat_sessions.get(session_id, {})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session with new form data if provided
        if form_data:
            session["form_data"].update(form_data)
        
        # Generate response based on message content and context
        response = await generate_chat_response(message, session["form_data"])
        
        # Store conversation in session
        session["conversation_history"].append({
            "user_message": message,
            "bot_response": response,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Chat message processed for session: {session_id}")
        return {
            "success": True,
            "response": response,
            "sessionId": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling chat message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error handling chat message: {str(e)}")

async def generate_chat_response(message: str, form_data: Dict[str, Any]) -> str:
    """Generate contextual chat responses based on user message and form data"""
    
    message_lower = message.lower()
    insurance_type = form_data.get('insuranceType', 'general')
    name = form_data.get('name', 'there')
    
    # Quote-related responses
    if any(word in message_lower for word in ['quote', 'price', 'cost', 'premium', 'rate']):
        if insurance_type == 'car':
            vehicle_model = form_data.get('vehicleModel', 'your vehicle')
            return f"I'd be happy to help you get a quote for {vehicle_model}! Based on your information, I can connect you with our auto insurance specialists who will provide personalized rates. Would you like me to schedule a call with one of our agents?"
        
        elif insurance_type == 'term':
            age = form_data.get('age', 'your age group')
            return f"For term life insurance at age {age}, our rates are very competitive. I can help you calculate coverage based on your income and family needs. Would you like to explore different coverage amounts?"
        
        else:
            return f"I can help you get a personalized quote for {insurance_type} insurance. Let me connect you with our specialists who will provide the best rates for your specific needs."
    
    # Coverage-related responses
    elif any(word in message_lower for word in ['coverage', 'cover', 'protection', 'benefit']):
        if insurance_type == 'car':
            return "Our auto insurance covers collision, comprehensive, liability, and uninsured motorist protection. We also offer roadside assistance and rental car coverage. What specific coverage are you most interested in?"
        
        elif insurance_type == 'term':
            return "Term life insurance provides pure death benefit protection for a specific period. Coverage amounts typically range from $100,000 to $5 million. How much coverage do you think your family would need?"
        
        else:
            return f"Our {insurance_type} insurance provides comprehensive protection tailored to your needs. I can explain the specific benefits and coverage options available to you."
    
    # Claims-related responses
    elif any(word in message_lower for word in ['claim', 'accident', 'damage', 'incident']):
        return "Our claims process is designed to be simple and fast. We have 24/7 claim reporting and most claims are processed within 48 hours. We also have a mobile app for easy claim submission with photos. Have you had any recent incidents you need to report?"
    
    # Comparison responses
    elif any(word in message_lower for word in ['compare', 'better', 'difference', 'vs', 'versus']):
        return "I can help you compare different insurance options and providers. Our policies often offer better rates and more comprehensive coverage than competitors. What specific aspects would you like to compare - price, coverage, or service?"
    
    # General help responses
    elif any(word in message_lower for word in ['help', 'information', 'tell me', 'explain']):
        return f"I'm here to help you understand {insurance_type} insurance options! I can explain coverage types, help you get quotes, compare policies, or answer any specific questions you have. What would you like to know more about?"
    
    # Default contextual response
    else:
        responses = {
            'car': "I understand you're looking for auto insurance information. I can help you with coverage options, quotes, claims process, or any other questions about protecting your vehicle.",
            'term': "I'm here to help with term life insurance. Whether you need information about coverage amounts, premium costs, or application process, I'm ready to assist you.",
            'home': "I can help you with home insurance questions - from property coverage to personal belongings protection. What specific aspect of home insurance interests you most?",
            'health': "I'm here to assist with health insurance options. I can explain different plans, coverage benefits, and help you find the right healthcare protection for your needs.",
            'investment': "I can help you understand investment insurance products that combine protection with wealth building. These products can help secure your financial future while providing insurance coverage."
        }
        
        return responses.get(insurance_type, f"Thank you for your message, {name}! I'm here to help you with your insurance needs. Could you please tell me more about what specific information you're looking for?")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")