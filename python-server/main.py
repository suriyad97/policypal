import os
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import pyodbc
from contextlib import asynccontextmanager
import asyncio
from concurrent.futures import ThreadPoolExecutor
import openai
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'server': os.getenv('AZURE_SQL_SERVER', 'tcp:ml-lms-db.database.windows.net'),
    'database': os.getenv('AZURE_SQL_DATABASE', 'lms-db'),
    'username': os.getenv('AZURE_SQL_USERNAME', 'lmsadmin-001'),
    'password': os.getenv('AZURE_SQL_PASSWORD', 'Creative@2025'),
    'driver': '{ODBC Driver 18 for SQL Server}',
    'encrypt': 'yes',
    'trust_server_certificate': 'no'
}

# LLM Configuration
LLM_CONFIG = {
    'endpoint': os.getenv('LLM_ENDPOINT', ''),
    'subscription_key': os.getenv('LLM_SUBSCRIPTION_KEY', ''),
    'deployment_name': os.getenv('LLM_DEPLOYMENT_NAME', ''),
    'model_name': os.getenv('LLM_MODEL_NAME', 'gpt-3.5-turbo'),
    'api_version': os.getenv('LLM_API_VERSION', '2024-02-15-preview')
}

# Thread pool for database operations
executor = ThreadPoolExecutor(max_workers=10)

# Pydantic models
class CustomerData(BaseModel):
    name: str
    email: EmailStr
    phone: str
    zipCode: str
    insuranceType: str
    
    # Auto insurance specific
    vehicleNumber: Optional[str] = None
    vehicleModel: Optional[str] = None
    vehicleYear: Optional[str] = None
    
    # Health insurance specific
    age: Optional[str] = None
    gender: Optional[str] = None
    medicalHistory: Optional[str] = None
    
    # Term life insurance specific
    lifeAge: Optional[str] = None
    lifeGender: Optional[str] = None
    coverageAmount: Optional[str] = None
    relationship: Optional[str] = None
    
    # Savings plan specific
    savingsAge: Optional[str] = None
    savingsGender: Optional[str] = None
    monthlyInvestment: Optional[str] = None
    investmentGoal: Optional[str] = None
    
    # Home insurance specific
    homeAge: Optional[str] = None
    homeGender: Optional[str] = None
    
    currentProvider: Optional[str] = None

class InsuranceProductsRequest(BaseModel):
    productType: str
    age: Optional[int] = None
    gender: Optional[str] = None

class ConversationRequest(BaseModel):
    customerId: int
    sessionId: str

class MessageRequest(BaseModel):
    conversationId: int
    messages: List[Dict[str, str]]

class ChatMessage(BaseModel):
    sessionId: str
    message: str
    formData: CustomerData

class ChatInitRequest(BaseModel):
    sessionId: str
    formData: CustomerData

# Database service class
class DatabaseService:
    @staticmethod
    def get_connection():
        """Get database connection"""
        try:
            connection_string = (
                f"DRIVER={DB_CONFIG['driver']};"
                f"SERVER={DB_CONFIG['server']};"
                f"DATABASE={DB_CONFIG['database']};"
                f"UID={DB_CONFIG['username']};"
                f"PWD={DB_CONFIG['password']};"
                f"Encrypt={DB_CONFIG['encrypt']};"
                f"TrustServerCertificate={DB_CONFIG['trust_server_certificate']}"
            )
            
            logger.info(f"Connecting to database: {DB_CONFIG['server']}/{DB_CONFIG['database']}")
            conn = pyodbc.connect(connection_string, timeout=30)
            logger.info("Database connection successful")
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

    @staticmethod
    def get_insurance_products(product_type: str, age: Optional[int] = None, gender: Optional[str] = None):
        """Get insurance products filtered by type, age, and gender"""
        try:
            conn = DatabaseService.get_connection()
            cursor = conn.cursor()
            
            # Map frontend insurance types to database product_type values
            type_mapping = {
                'car': 'auto',
                'auto': 'auto',
                'term': 'term_life',
                'term_life': 'term_life',
                'health': 'health',
                'savings': 'savings',
                'home': 'home'
            }
            
            db_product_type = type_mapping.get(product_type, product_type)
            
            query = """
                SELECT * FROM insurance_products 
                WHERE product_type = ? AND is_active = 1
            """
            params = [db_product_type]
            
            if age:
                query += " AND min_age <= ? AND max_age >= ?"
                params.extend([age, age])
            
            if gender:
                # Map frontend gender values to database values
                gender_mapping = {
                    'Male': 'male',
                    'Female': 'female',
                    'male': 'male',
                    'female': 'female',
                    'non_binary': 'non_binary'
                }
                db_gender = gender_mapping.get(gender, gender.lower() if gender else None)
                query += " AND (target_gender = ? OR target_gender = 'all')"
                params.append(db_gender)
            
            query += " ORDER BY premium_amount ASC"
            
            cursor.execute(query, params)
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            conn.close()
            logger.info(f"Found {len(results)} insurance products for {db_product_type}")
            return results
            
        except Exception as e:
            logger.error(f"Error fetching insurance products: {str(e)}")
            return []

    @staticmethod
    def store_customer(customer_data: CustomerData):
        """Store customer data with validation"""
        try:
            # Validate customer data
            DatabaseService.validate_customer_data(customer_data)
            
            conn = DatabaseService.get_connection()
            cursor = conn.cursor()
            
            # Map frontend insurance types to database values
            insurance_type_mapping = {
                'car': 'auto',
                'auto': 'auto', 
                'term': 'term_life',
                'term_life': 'term_life',
                'health': 'health',
                'savings': 'savings',
                'home': 'home'
            }
            
            db_insurance_type = insurance_type_mapping.get(customer_data.insuranceType, customer_data.insuranceType)
            
            # Format data according to database schema
            formatted_data = {
                'name': customer_data.name.strip(),
                'email': customer_data.email.lower().strip(),
                'phone': customer_data.phone.strip(),
                'zip_code': customer_data.zipCode.strip(),
                'insurance_type': db_insurance_type,
                'current_provider': customer_data.currentProvider.strip() if customer_data.currentProvider else None,
                'lead_source': 'website'
            }
            
            # Add type-specific fields
            if db_insurance_type == 'auto':
                formatted_data.update({
                    'vehicle_number': customer_data.vehicleNumber.strip() if customer_data.vehicleNumber else None,
                    'vehicle_model': customer_data.vehicleModel.strip() if customer_data.vehicleModel else None,
                    'vehicle_year': int(customer_data.vehicleYear) if customer_data.vehicleYear else None
                })
            elif db_insurance_type == 'health':
                # Map gender values
                gender_value = None
                if customer_data.gender:
                    gender_mapping = {'Male': 'male', 'Female': 'female', 'male': 'male', 'female': 'female'}
                    gender_value = gender_mapping.get(customer_data.gender, customer_data.gender.lower())
                
                formatted_data.update({
                    'age': int(customer_data.age) if customer_data.age else None,
                    'gender': gender_value,
                    'medical_history': customer_data.medicalHistory.strip() if customer_data.medicalHistory else None
                })
            elif db_insurance_type == 'term_life':
                # Map gender values
                gender_value = None
                if customer_data.lifeGender or customer_data.gender:
                    gender_raw = customer_data.lifeGender or customer_data.gender
                    gender_mapping = {'Male': 'male', 'Female': 'female', 'male': 'male', 'female': 'female'}
                    gender_value = gender_mapping.get(gender_raw, gender_raw.lower())
                
                formatted_data.update({
                    'age': int(customer_data.lifeAge or customer_data.age) if (customer_data.lifeAge or customer_data.age) else None,
                    'gender': gender_value,
                    'coverage_amount': customer_data.coverageAmount.strip() if customer_data.coverageAmount else None,
                    'relationship': customer_data.relationship
                })
            elif db_insurance_type == 'savings':
                # Map gender values
                gender_value = None
                if customer_data.savingsGender or customer_data.gender:
                    gender_raw = customer_data.savingsGender or customer_data.gender
                    gender_mapping = {'Male': 'male', 'Female': 'female', 'male': 'male', 'female': 'female'}
                    gender_value = gender_mapping.get(gender_raw, gender_raw.lower())
                
                formatted_data.update({
                    'age': int(customer_data.savingsAge or customer_data.age) if (customer_data.savingsAge or customer_data.age) else None,
                    'gender': gender_value,
                    'monthly_investment': customer_data.monthlyInvestment.strip() if customer_data.monthlyInvestment else None,
                    'investment_goal': customer_data.investmentGoal.strip() if customer_data.investmentGoal else None
                })
            elif db_insurance_type == 'home':
                # Map gender values
                gender_value = None
                if customer_data.homeGender or customer_data.gender:
                    gender_raw = customer_data.homeGender or customer_data.gender
                    gender_mapping = {'Male': 'male', 'Female': 'female', 'male': 'male', 'female': 'female'}
                    gender_value = gender_mapping.get(gender_raw, gender_raw.lower())
                
                formatted_data.update({
                    'age': int(customer_data.homeAge or customer_data.age) if (customer_data.homeAge or customer_data.age) else None,
                    'gender': gender_value
                })
            
            # Build INSERT query
            columns = [k for k, v in formatted_data.items() if v is not None]
            placeholders = ', '.join(['?' for _ in columns])
            column_names = ', '.join(columns)
            values = [formatted_data[col] for col in columns]
            
            query = f"""
                INSERT INTO customers ({column_names})
                OUTPUT INSERTED.customer_id
                VALUES ({placeholders})
            """
            
            cursor.execute(query, values)
            result = cursor.fetchone()
            customer_id = result[0] if result else None
            
            conn.commit()
            conn.close()
            
            logger.info(f"Customer stored successfully with ID: {customer_id}")
            return customer_id
            
        except Exception as e:
            logger.error(f"Error storing customer: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def validate_customer_data(customer_data: CustomerData):
        """Validate customer data based on insurance type"""
        if not customer_data.name.strip():
            raise HTTPException(status_code=400, detail="Name is required")
        if not customer_data.email.strip():
            raise HTTPException(status_code=400, detail="Email is required")
        if not customer_data.phone.strip():
            raise HTTPException(status_code=400, detail="Phone is required")
        if not customer_data.zipCode.strip():
            raise HTTPException(status_code=400, detail="ZIP code is required")
        if not customer_data.insuranceType:
            raise HTTPException(status_code=400, detail="Insurance type is required")
        
        if len(customer_data.phone) < 10:
            raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
        
        # Map frontend insurance types to database values for validation
        insurance_type_mapping = {
            'car': 'auto',
            'auto': 'auto',
            'term': 'term_life', 
            'term_life': 'term_life',
            'health': 'health',
            'savings': 'savings',
            'home': 'home'
        }
        
        db_insurance_type = insurance_type_mapping.get(customer_data.insuranceType, customer_data.insuranceType)
        
        # Type-specific validation
        if db_insurance_type == 'auto':
            if not customer_data.vehicleNumber or not customer_data.vehicleNumber.strip():
                raise HTTPException(status_code=400, detail="Vehicle number is required for auto insurance")
            if not customer_data.vehicleModel or not customer_data.vehicleModel.strip():
                raise HTTPException(status_code=400, detail="Vehicle model is required for auto insurance")
            if not customer_data.vehicleYear:
                raise HTTPException(status_code=400, detail="Vehicle year is required for auto insurance")
        
        elif db_insurance_type in ['health', 'term_life', 'savings', 'home']:
            age_field = customer_data.lifeAge or customer_data.savingsAge or customer_data.age
            gender_field = customer_data.lifeGender or customer_data.savingsGender or customer_data.gender
            
            if not age_field or not age_field.isdigit() or int(age_field) < 18 or int(age_field) > 80:
                raise HTTPException(status_code=400, detail="Valid age between 18 and 80 is required")
            if not gender_field:
                raise HTTPException(status_code=400, detail="Gender is required")
            
            if db_insurance_type == 'term_life':
                if not customer_data.coverageAmount or not customer_data.coverageAmount.strip():
                    raise HTTPException(status_code=400, detail="Coverage amount is required for term life insurance")
                if not customer_data.relationship:
                    raise HTTPException(status_code=400, detail="Relationship is required for term life insurance")
            
            if db_insurance_type == 'savings':
                if not customer_data.monthlyInvestment or not customer_data.monthlyInvestment.strip():
                    raise HTTPException(status_code=400, detail="Monthly investment is required for savings plans")
                if not customer_data.investmentGoal or not customer_data.investmentGoal.strip():
                    raise HTTPException(status_code=400, detail="Investment goal is required for savings plans")

    @staticmethod
    def get_customer(customer_id: int):
        """Get customer by ID"""
        try:
            conn = DatabaseService.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM customers WHERE customer_id = ?", [customer_id])
            columns = [column[0] for column in cursor.description]
            row = cursor.fetchone()
            
            conn.close()
            
            if row:
                return dict(zip(columns, row))
            return None
            
        except Exception as e:
            logger.error(f"Error fetching customer: {str(e)}")
            return None

    @staticmethod
    def create_conversation_history(customer_id: int, session_id: str):
        """Create conversation history record"""
        try:
            conn = DatabaseService.get_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO customer_conversations (customer_id, session_id, messages, conversation_status)
                OUTPUT INSERTED.conversation_id
                VALUES (?, ?, ?, ?)
            """
            
            cursor.execute(query, [customer_id, session_id, '[]', 'active'])
            result = cursor.fetchone()
            conversation_id = result[0] if result else None
            
            conn.commit()
            conn.close()
            
            return conversation_id
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            return None

    @staticmethod
    def update_conversation_history(conversation_id: int, messages: List[Dict[str, str]]):
        """Update conversation history with new messages"""
        try:
            conn = DatabaseService.get_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE customer_conversations 
                SET messages = ?
                WHERE conversation_id = ?
            """
            
            cursor.execute(query, [json.dumps(messages), conversation_id])
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation: {str(e)}")
            return False

# LLM Service class
class LLMService:
    @staticmethod
    def generate_system_prompt(form_data: CustomerData, products: List[Dict], customer: Dict):
        """Generate system prompt based on form data"""
        insurance_context = {
            'auto': f"The customer is looking for auto insurance for their {customer.get('vehicle_model', 'vehicle')} ({customer.get('vehicle_year', 'unknown year')}) with registration number {customer.get('vehicle_number', 'not provided')}.",
            'health': f"The customer is a {customer.get('age', 'unknown')} year old {customer.get('gender', 'person')} looking for health insurance. {customer.get('medical_history', 'No pre-existing conditions mentioned.')}",
            'term_life': f"The customer is a {customer.get('age', 'unknown')} year old {customer.get('gender', 'person')} looking for term life insurance with {customer.get('coverage_amount', 'unspecified')} coverage for {customer.get('relationship', 'self')}.",
            'savings': f"The customer is a {customer.get('age', 'unknown')} year old {customer.get('gender', 'person')} looking for a savings plan with {customer.get('monthly_investment', 'unspecified')} monthly investment for {customer.get('investment_goal', 'general savings')}.",
            'home': f"The customer is a {customer.get('age', 'unknown')} year old {customer.get('gender', 'person')} looking for home insurance."
        }

        available_products = '\n'.join([
            f"{p['provider_name']} - {p['product_name']}: ₹{p['premium_amount']:.2f}/month, Coverage: {p['coverage_details']}"
            for p in products
        ])

        return f"""You are PolicyPal, a professional and friendly insurance advisor. You are helping {customer['name']} from {customer['zip_code']} with their {customer['insurance_type']} insurance needs.

Customer Details:
- Name: {customer['name']}
- Location: {customer['zip_code']}
- Email: {customer['email']}
- Phone: {customer['phone']}
- Insurance Type: {customer['insurance_type']}
{f"- Current Provider: {customer['current_provider']}" if customer.get('current_provider') else ''}

Context: {insurance_context.get(customer['insurance_type'], 'General insurance inquiry.')}

Available Insurance Products:
{available_products}

Instructions:
1. Be professional, helpful, and knowledgeable about insurance
2. Ask relevant follow-up questions to better understand their needs
3. Provide personalized recommendations from the available products above
4. Explain insurance terms in simple language
5. Focus on finding the best coverage for their specific situation
6. Keep responses concise but informative
7. Show empathy and build trust
8. When recommending products, use the exact provider names and pricing from the available products
9. Explain why specific products are suitable for their needs

Start the conversation by greeting them personally and acknowledging their specific insurance needs."""

    @staticmethod
    async def call_llm_api(messages: List[Dict[str, str]]):
        """Call LLM API"""
        try:
            if not LLM_CONFIG['subscription_key']:
                return "I apologize, but I'm having trouble connecting to our AI system right now. However, I'm still here to help you with your insurance needs! Could you tell me more about what specific coverage you're looking for?"
            
            # Initialize OpenAI client
            if 'azure' in LLM_CONFIG['endpoint'].lower():
                client = OpenAI(
                    api_key=LLM_CONFIG['subscription_key'],
                    base_url=LLM_CONFIG['endpoint'].replace('/chat/completions', '').replace(f'?api-version={LLM_CONFIG["api_version"]}', ''),
                    default_headers={"api-key": LLM_CONFIG['subscription_key']}
                )
            else:
                client = OpenAI(api_key=LLM_CONFIG['subscription_key'])
            
            response = client.chat.completions.create(
                model=LLM_CONFIG['model_name'] or LLM_CONFIG['deployment_name'],
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"LLM API Error: {str(e)}")
            return "I apologize, but I'm having trouble connecting to our AI system right now. However, I'm still here to help you with your insurance needs! Could you tell me more about what specific coverage you're looking for?"

# FastAPI app
app = FastAPI(title="PolicyPal Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions
sessions = {}

@app.on_event("startup")
async def startup_event():
    """Startup event to check configuration"""
    logger.info("🚀 PolicyPal Python Backend starting up...")
    logger.info(f"📊 Database Server: {DB_CONFIG['server']}")
    logger.info(f"📊 Database Name: {DB_CONFIG['database']}")
    logger.info(f"🤖 LLM Endpoint: {'Configured' if LLM_CONFIG['endpoint'] else 'Not configured'}")
    
    # Test database connection
    try:
        conn = DatabaseService.get_connection()
        conn.close()
        logger.info("✅ Database connection test successful")
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {str(e)}")

# API Routes

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PolicyPal Python Backend is running!",
        "status": "active",
        "endpoints": [
            "/api/database/products",
            "/api/database/customer",
            "/api/chat/initialize",
            "/api/chat/message"
        ]
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "timestamp": datetime.now().isoformat()}

@app.post("/api/database/products")
async def get_insurance_products(request: InsuranceProductsRequest):
    """Get insurance products"""
    try:
        loop = asyncio.get_event_loop()
        products = await loop.run_in_executor(
            executor, 
            DatabaseService.get_insurance_products,
            request.productType,
            request.age,
            request.gender
        )
        return {"success": True, "data": products}
    except Exception as e:
        logger.error(f"Products API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch products")

@app.post("/api/database/customer")
async def store_customer(request: Dict[str, CustomerData]):
    """Store customer data"""
    try:
        customer_data = request.get('customerData')
        if not customer_data:
            raise HTTPException(status_code=400, detail="Customer data is required")
        
        loop = asyncio.get_event_loop()
        customer_id = await loop.run_in_executor(
            executor,
            DatabaseService.store_customer,
            customer_data
        )
        
        return {"success": True, "data": {"customerId": customer_id}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Customer API error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/database/customer/{customer_id}")
async def get_customer(customer_id: int):
    """Get customer data"""
    try:
        loop = asyncio.get_event_loop()
        customer = await loop.run_in_executor(
            executor,
            DatabaseService.get_customer,
            customer_id
        )
        return {"success": True, "data": customer}
    except Exception as e:
        logger.error(f"Get customer API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customer")

@app.post("/api/database/conversation")
async def create_conversation(request: ConversationRequest):
    """Create conversation history"""
    try:
        loop = asyncio.get_event_loop()
        conversation_id = await loop.run_in_executor(
            executor,
            DatabaseService.create_conversation_history,
            request.customerId,
            request.sessionId
        )
        return {"success": True, "data": {"conversationId": conversation_id}}
    except Exception as e:
        logger.error(f"Conversation API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create conversation")

@app.put("/api/database/conversation/{conversation_id}")
async def update_conversation(conversation_id: int, request: MessageRequest):
    """Update conversation history"""
    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            executor,
            DatabaseService.update_conversation_history,
            conversation_id,
            request.messages
        )
        return {"success": success}
    except Exception as e:
        logger.error(f"Update conversation API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update conversation")

@app.post("/api/chat/initialize")
async def initialize_chat(request: ChatInitRequest):
    """Initialize chat session"""
    try:
        # Store session data
        sessions[request.sessionId] = {
            'formData': request.formData,
            'history': [],
            'context': request.formData
        }
        
        # Generate initial message based on insurance type
        name = request.formData.name
        insurance_type = request.formData.insuranceType
        location = request.formData.zipCode
        
        initial_messages = {
            'auto': f"Hi {name}! I see you're looking for auto insurance in {location}. I'd love to help you find the perfect coverage for your {getattr(request.formData, 'vehicleModel', 'vehicle')}. Let me get you some personalized quotes!",
            'health': f"Hello {name}! Looking for health insurance in {location}? Great choice! I'm here to help you find comprehensive coverage that fits your needs and budget.",
            'term_life': f"Hi {name}! Life insurance is such an important decision. I'm here to help you find the right coverage in {location} to protect your loved ones.",
            'savings': f"Hello {name}! I see you're interested in savings plans in {location}. I'd be happy to help you find the perfect investment option for your financial goals!",
            'home': f"Hi {name}! Looking for home insurance in {location}? I'm here to help you protect your most valuable asset with the right coverage."
        }
        
        initial_message = initial_messages.get(insurance_type, f"Hi {name}! I'm here to help you find the right insurance coverage in {location}. What questions do you have?")
        
        return {
            "success": True,
            "message": initial_message,
            "sessionId": request.sessionId
        }
        
    except Exception as e:
        logger.error(f"Initialize error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize chat session")

@app.post("/api/chat/message")
async def handle_chat_message(request: ChatMessage):
    """Handle chat messages"""
    try:
        # Get session data
        session = sessions.get(request.sessionId)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Add user message to history
        session['history'].append({"role": "user", "content": request.message})
        
        # Generate simple rule-based response for now
        response = generate_simple_response(request.message, session['context'])
        
        # Add bot response to history
        session['history'].append({"role": "assistant", "content": response})
        
        # Update session
        sessions[request.sessionId] = session
        
        return {
            "success": True,
            "message": response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Message error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process message")

def generate_simple_response(message: str, context: CustomerData) -> str:
    """Generate simple rule-based responses"""
    lower_message = message.lower()
    
    # Map frontend insurance types to database values
    insurance_type_mapping = {
        'car': 'auto',
        'auto': 'auto',
        'term': 'term_life',
        'term_life': 'term_life',
        'health': 'health',
        'savings': 'savings',
        'home': 'home'
    }
    
    insurance_type = insurance_type_mapping.get(context.insuranceType, context.insuranceType)
    name = context.name
    
    # Auto insurance responses
    if insurance_type == 'auto':
        if any(word in lower_message for word in ['quote', 'price', 'cost', 'rate']):
            return f"Great question about pricing, {name}! Based on your {getattr(context, 'vehicleModel', 'vehicle')}, I can get you competitive quotes. Most customers in your area save around $400-800 per year. Would you like me to show you some specific options?"
        elif any(word in lower_message for word in ['coverage', 'protection', 'what']):
            return "For auto insurance, I recommend comprehensive coverage that includes liability, collision, comprehensive, and uninsured motorist protection. This gives you complete peace of mind on the road. What's most important to you - lowest price or maximum protection?"
    
    # Health insurance responses
    elif insurance_type == 'health':
        if any(word in lower_message for word in ['quote', 'price', 'cost', 'rate']):
            return f"Health insurance costs vary based on your needs, {name}. For someone your age, plans typically range from $200-600 per month. The good news is there are often subsidies available! Would you like me to check what options are available in your area?"
        elif any(word in lower_message for word in ['coverage', 'benefits', 'what']):
            return "Health insurance should cover doctor visits, hospital stays, prescription drugs, and preventive care. I can help you find a plan that includes your preferred doctors and covers any medications you need. Do you have any specific healthcare needs?"
    
    # Term life insurance responses
    elif insurance_type == 'term_life':
        if any(word in lower_message for word in ['quote', 'price', 'cost', 'rate']):
            return f"Term life insurance is very affordable, {name}! For someone your age, a $500,000 policy might cost as little as $20-40 per month. The exact rate depends on your health and lifestyle. Would you like me to get you some personalized quotes?"
        elif any(word in lower_message for word in ['coverage', 'amount', 'how much']):
            return "A good rule of thumb is 10-12 times your annual income. This ensures your family can maintain their lifestyle and pay off debts. Based on what you've told me, I'd recommend looking at coverage between $250,000 to $1,000,000. What feels right for your situation?"
    
    # Savings plans responses
    elif insurance_type == 'savings':
        if any(word in lower_message for word in ['returns', 'growth', 'interest']):
            return f"Great question about returns, {name}! Our savings plans typically offer 6-8% annual returns, which is much better than traditional savings accounts. Plus, you get tax benefits and life insurance protection. Would you like to see how your money could grow over time?"
        elif any(word in lower_message for word in ['flexible', 'change', 'increase']):
            return "Absolutely! Our savings plans are very flexible. You can increase your contributions, take partial withdrawals after 5 years, and even pause payments if needed. Life happens, and your plan should adapt with you. What kind of flexibility is most important to you?"
    
    # Home insurance responses
    elif insurance_type == 'home':
        if any(word in lower_message for word in ['quote', 'price', 'cost', 'rate']):
            return f"Home insurance rates depend on your property value and location, {name}. Most homeowners in your area pay between $800-2000 per year. I can help you find competitive rates that protect your most valuable asset. Would you like me to get you some quotes?"
        elif any(word in lower_message for word in ['coverage', 'protection', 'what']):
            return "Home insurance should cover your dwelling, personal property, liability, and additional living expenses. This protects you from fire, theft, storms, and accidents on your property. What's most important to you - protecting the structure or your belongings?"
    
    # General responses
    if any(word in lower_message for word in ['thank', 'thanks', 'appreciate']):
        return f"You're very welcome, {name}! I'm here to make insurance simple and help you get the best coverage for your needs. What other questions can I answer for you?"
    
    if any(word in lower_message for word in ['help', 'confused', 'understand']):
        return "I completely understand - insurance can be confusing! That's exactly why I'm here. Let me break this down in simple terms and help you find exactly what you need. What specific part would you like me to explain?"
    
    # Default response
    return f"That's a great question, {name}! Let me make sure I understand your needs correctly so I can give you the best recommendations. Can you tell me more about what's most important to you in your {insurance_type} insurance coverage?"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")