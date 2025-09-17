from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
import pyodbc
import os
import json
from datetime import datetime
import logging
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment from .env if present
load_dotenv()

# Database configuration
def _detect_odbc_driver() -> str:
    # Prefer env override if provided
    driver_env = os.getenv('AZURE_SQL_DRIVER') or os.getenv('ODBC_DRIVER')
    if driver_env:
        # Ensure it's wrapped in {}
        d = driver_env.strip()
        return d if d.startswith('{') else '{' + d + '}'

    preferred = [
        'ODBC Driver 18 for SQL Server',
        'ODBC Driver 17 for SQL Server',
    ]
    try:
        drivers = set(pyodbc.drivers())
        for name in preferred:
            if name in drivers:
                return '{' + name + '}'
    except Exception:
        # Fall back to 18 if detection fails
        pass
    return '{ODBC Driver 18 for SQL Server}'

def _normalize_server(server: str) -> str:
    if not server:
        return server
    s = server.strip()
    # Accept values like tcp:host or host; add default port for Azure if missing
    if s.lower().startswith('tcp:'):
        s_val = s
    else:
        s_val = s
    # Append default port for Azure if not specified
    if 'database.windows.net' in s_val and ',' not in s_val:
        s_val = f"{s_val},1433"
    return s_val

# Prefer configuration from environment, fall back to sensible defaults
ENV_SERVER = os.getenv('AZURE_SQL_SERVER')
ENV_DATABASE = os.getenv('AZURE_SQL_DATABASE')
ENV_USERNAME = os.getenv('AZURE_SQL_USERNAME')
ENV_PASSWORD = os.getenv('AZURE_SQL_PASSWORD')
ENV_DRIVER = os.getenv('AZURE_SQL_DRIVER') or os.getenv('ODBC_DRIVER')

# Check if required environment variables are set
if not all([ENV_SERVER, ENV_DATABASE, ENV_USERNAME, ENV_PASSWORD]):
    logger.warning("Database environment variables not fully configured. Server will start but database operations may fail.")
    logger.warning("Please set: AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USERNAME, AZURE_SQL_PASSWORD")

DB_CONFIG = {
    'server': _normalize_server(ENV_SERVER) if ENV_SERVER else '',
    'database': ENV_DATABASE or '',
    'username': ENV_USERNAME or '',
    'password': ENV_PASSWORD or '',
    'driver': (_detect_odbc_driver() if not ENV_DRIVER else (ENV_DRIVER if ENV_DRIVER.startswith('{') else '{' + ENV_DRIVER + '}')),
    'encrypt': 'Yes',
    'trust_server_certificate': 'No',
    'timeout': '30'
}
# Pydantic models
class CustomerData(BaseModel):
    class Config:
        populate_by_name = True
        
    name: str
    email: str
    phone: str
    age: Optional[int] = None
    gender: Optional[str] = None
    zip_code: Optional[str] = Field(None, alias='zipCode')
    insurance_type: str = Field(alias='insuranceType')
    vehicle_number: Optional[str] = Field(None, alias='vehicleNumber')
    vehicle_model: Optional[str] = Field(None, alias='vehicleModel')
    vehicle_year: Optional[int] = Field(None, alias='vehicleYear')
    medical_history: Optional[str] = Field(None, alias='medicalHistory')
    coverage_amount: Optional[str] = Field(None, alias='coverageAmount')
    monthly_investment: Optional[str] = Field(None, alias='monthlyInvestment')
    investment_goal: Optional[str] = Field(None, alias='investmentGoal')
    current_provider: Optional[str] = Field(None, alias='currentProvider')
    def validate_gender(cls, v):
        if v is not None and v.lower() not in ['male', 'female', 'non_binary']:
            return v.lower() if v.lower() in ['male', 'female'] else 'male'
        return v.lower() if v else None

    @validator('insurance_type')
    def validate_insurance_type(cls, v):
        type_mapping = {
            'car': 'auto',
            'term': 'term_life',
            'auto': 'auto',
            'health': 'health',
            'term_life': 'term_life',
            'savings': 'savings',
            'home': 'home'
        }
        return type_mapping.get(v.lower(), v.lower())

class CustomerRequest(BaseModel):
    customerData: CustomerData

class ProductFilter(BaseModel):
    productType: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class ChatInitialize(BaseModel):
    sessionId: str
    formData: Dict[str, Any]

class ChatMessage(BaseModel):
    sessionId: str
    message: str
    formData: Optional[Dict[str, Any]] = None

# Database service
class DatabaseService:
    def __init__(self):
        self.connection_string = (
            f"DRIVER={DB_CONFIG['driver']};"
            f"SERVER={DB_CONFIG['server']};"
            f"DATABASE={DB_CONFIG['database']};"
            f"UID={DB_CONFIG['username']};"
            f"PWD={DB_CONFIG['password']};"
            f"Encrypt={DB_CONFIG['encrypt']};"
            f"TrustServerCertificate={DB_CONFIG['trust_server_certificate']};"
            f"Connection Timeout={DB_CONFIG['timeout']};"
        )

    def get_connection(self):
        try:
            if not all([DB_CONFIG['server'], DB_CONFIG['database'], DB_CONFIG['username'], DB_CONFIG['password']]):
                raise Exception("Database configuration incomplete. Please check environment variables.")
            return pyodbc.connect(self.connection_string)
        except Exception as e:
            safe_conn_str = self.connection_string.replace(DB_CONFIG['password'], '***') if DB_CONFIG.get('password') else self.connection_string
            logger.error(f"Database connection failed: {e}\nConnection string used (sanitized): {safe_conn_str}")
            raise HTTPException(status_code=500, detail="Database connection failed")

    def store_customer(self, customer_data: CustomerData):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Insert customer data
            query = """
            INSERT INTO customers (
                name, email, phone, age, gender, zip_code, insurance_type,
                vehicle_number, vehicle_model, vehicle_year, medical_history,
                coverage_amount, monthly_investment, investment_goal, current_provider
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            cursor.execute(query, (
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
                customer_data.current_provider
            ))
            
            conn.commit()
            
            # Get the inserted customer ID
            cursor.execute("SELECT @@IDENTITY")
            customer_id = cursor.fetchone()[0]
            
            conn.close()
            return {"success": True, "customerId": int(customer_id)}
            
        except Exception as e:
            logger.error(f"Error storing customer: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to store customer: {str(e)}")

    def get_products(self, product_type: str = None, age: int = None, gender: str = None):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            query = """
            SELECT product_id, product_name, product_type, description, 
                   premium_amount, coverage_amount, min_age, max_age, 
                   target_gender, features, benefits
            FROM insurance_products 
            WHERE is_active = 1
            """
            params = []
            
            if product_type:
                query += " AND product_type = ?"
                params.append(product_type)
            
            if age:
                query += " AND min_age <= ? AND max_age >= ?"
                params.extend([age, age])
            
            if gender:
                query += " AND (target_gender = ? OR target_gender = 'all')"
                params.append(gender.lower())
            
            query += " ORDER BY premium_amount ASC"
            
            cursor.execute(query, params)
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                product = dict(zip(columns, row))
                # Parse JSON fields
                if product.get('features'):
                    try:
                        product['features'] = json.loads(product['features'])
                    except:
                        product['features'] = []
                if product.get('benefits'):
                    try:
                        product['benefits'] = json.loads(product['benefits'])
                    except:
                        product['benefits'] = []
                results.append(product)
            
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get products: {str(e)}")

    def store_conversation(self, session_id: str, message: str, response: str, customer_id: int = None):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            query = """
            INSERT INTO conversations (session_id, customer_id, message, response, created_at)
            VALUES (?, ?, ?, ?, GETDATE())
            """
            
            cursor.execute(query, (session_id, customer_id, message, response))
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing conversation: {e}")

# Initialize database service
db_service = DatabaseService()

# FastAPI app
app = FastAPI(
    title="PolicyPal Insurance API",
    description="Insurance management system with AI chat",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/")
async def root():
    return {"message": "PolicyPal Insurance API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    try:
        # Test database connection
        conn = db_service.get_connection()
        conn.close()
        return {"status": "healthy", "database": "connected", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/api/debug/odbc")
async def debug_odbc():
    try:
        drivers = pyodbc.drivers()
    except Exception:
        drivers = []
    return {
        "drivers": drivers,
        "driver_selected": DB_CONFIG.get('driver'),
        "server": DB_CONFIG.get('server'),
        "database": DB_CONFIG.get('database'),
        "encrypt": DB_CONFIG.get('encrypt'),
        "trust_server_certificate": DB_CONFIG.get('trust_server_certificate'),
        "uid_present": bool(DB_CONFIG.get('username')),
        "pwd_present": bool(DB_CONFIG.get('password')),
    }

@app.get("/api/debug/db-connection")
async def debug_db_connection():
    # Attempt a raw connection to capture the underlying ODBC error
    try:
        conn = pyodbc.connect(db_service.connection_string)
        conn.close()
        return {"success": True, "message": "Connected successfully"}
    except Exception as e:
        safe_conn_str = db_service.connection_string.replace(DB_CONFIG['password'], '***') if DB_CONFIG.get('password') else db_service.connection_string
        try:
            drivers = pyodbc.drivers()
        except Exception:
            drivers = []
        return {
            "success": False,
            "error": str(e),
            "connection_string_sanitized": safe_conn_str,
            "available_drivers": drivers,
            "selected_driver": DB_CONFIG.get('driver'),
        }

@app.post("/api/database/customer")
async def store_customer(request: CustomerRequest):
    try:
        result = db_service.store_customer(request.customerData)
        return result
    except Exception as e:
        logger.error(f"Error in store_customer endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/database/products")
async def get_products(filter_data: ProductFilter):
    try:
        products = db_service.get_products(
            product_type=filter_data.productType,
            age=filter_data.age,
            gender=filter_data.gender
        )
        return {"products": products}
    except Exception as e:
        logger.error(f"Error in get_products endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/initialize")
async def initialize_chat(request: ChatInitialize):
    try:
        # Store customer data if provided
        customer_id = None
        if request.formData:
            # Create CustomerData directly from formData (Pydantic will handle field mapping)
            customer_data_dict = request.formData.copy()
            
            # Ensure required fields with proper names
            if 'insuranceType' not in customer_data_dict and 'insurance_type' not in customer_data_dict:
                customer_data_dict['insuranceType'] = 'auto'
            
            try:
                customer_data = CustomerData(**customer_data_dict)
                result = db_service.store_customer(customer_data)
                customer_id = result.get('customerId')
            except Exception as e:
                logger.warning(f"Could not store customer data: {e}")
        
        # Generate initial response
        insurance_type = request.formData.get('insuranceType', 'insurance') if request.formData else 'insurance'
        name = request.formData.get('name', 'there') if request.formData else 'there'
        
        response = f"Hello {name}! I'm here to help you with your {insurance_type} needs. I can provide quotes, explain coverage options, and answer any questions you have. What would you like to know?"
        
        # Store conversation
        if customer_id:
            db_service.store_conversation(request.sessionId, "Chat initialized", response, customer_id)
        
        return {
            "success": True,
            "response": response,
            "sessionId": request.sessionId,
            "customerId": customer_id
        }
        
    except Exception as e:
        logger.error(f"Error initializing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/message")
async def chat_message(request: ChatMessage):
    try:
        # Get context from form data
        insurance_type = request.formData.get('insuranceType', 'insurance') if request.formData else 'insurance'
        name = request.formData.get('name', 'there') if request.formData else 'there'
        
        # Simple rule-based responses (can be enhanced with LLM)
        message_lower = request.message.lower()
        
        if any(word in message_lower for word in ['quote', 'price', 'cost', 'premium']):
            if insurance_type == 'car' or insurance_type == 'auto':
                response = f"For auto insurance quotes, I'll need some details about your vehicle. Based on your information, our auto insurance plans start from ₹5,000 annually. Would you like me to show you specific plans that match your needs?"
            elif insurance_type == 'health':
                response = f"Health insurance premiums vary based on age and coverage. Our health plans start from ₹8,000 annually. Would you like to see plans suitable for your age group?"
            elif insurance_type == 'term':
                response = f"Term life insurance is very affordable. Based on your profile, premiums can start from ₹6,000 annually. Shall I show you some term life options?"
            else:
                response = f"I can help you get a quote for {insurance_type} insurance. Let me find the best options for you based on your requirements."
        
        elif any(word in message_lower for word in ['coverage', 'cover', 'benefit']):
            response = f"Our {insurance_type} insurance provides comprehensive coverage including accident protection, liability coverage, and additional benefits. Would you like me to explain the specific coverage details?"
        
        elif any(word in message_lower for word in ['claim', 'claims']):
            response = f"Our claims process is simple and fast. You can file claims online or through our mobile app. Most {insurance_type} claims are processed within 24-48 hours. Do you have any specific questions about the claims process?"
        
        else:
            response = f"I understand you're asking about {insurance_type} insurance. I'm here to help with quotes, coverage details, claims information, and any other questions. What specific aspect would you like to know more about?"
        
        # Store conversation (you might want to get customer_id from session)
        db_service.store_conversation(request.sessionId, request.message, response)
        
        return {
            "success": True,
            "response": response,
            "sessionId": request.sessionId
        }
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
