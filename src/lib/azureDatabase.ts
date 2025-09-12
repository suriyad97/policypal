import sql from 'mssql';

// Azure SQL Database configuration
const dbConfig = {
  server: import.meta.env.VITE_AZURE_SQL_SERVER,
  database: import.meta.env.VITE_AZURE_SQL_DATABASE,
  user: import.meta.env.VITE_AZURE_SQL_USERNAME,
  password: import.meta.env.VITE_AZURE_SQL_PASSWORD,
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: false // For Azure SQL
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Database types matching the Azure SQL schema
export interface InsuranceProduct {
  product_id: number;
  product_name: string;
  product_type: 'savings' | 'auto' | 'home' | 'health' | 'term_life';
  target_gender: 'male' | 'female' | 'non_binary' | 'all';
  min_age: number;
  max_age: number;
  premium_amount: number;
  coverage_details: string;
  provider_name: string;
  features: string; // JSON string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  customer_id?: number;
  // Basic Information
  name: string;
  email: string;
  phone: string;
  zip_code: string;
  insurance_type: 'savings' | 'auto' | 'home' | 'health' | 'term_life';
  
  // Demographics (for health, term_life, savings)
  age?: number;
  gender?: 'male' | 'female' | 'non_binary';
  
  // Auto Insurance Specific
  vehicle_number?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  
  // Health Insurance Specific
  medical_history?: string;
  
  // Term Life Insurance Specific
  coverage_amount?: string;
  relationship?: 'self' | 'spouse' | 'parents' | 'child';
  
  // Savings Plan Specific
  monthly_investment?: string;
  investment_goal?: string;
  
  // Optional
  current_provider?: string;
  status?: 'active' | 'quoted' | 'converted' | 'inactive';
  lead_source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerConversation {
  conversation_id?: number;
  customer_id: number;
  session_id: string;
  messages: string; // JSON string
  conversation_status?: 'active' | 'completed' | 'abandoned';
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Database connection pool
let pool: sql.ConnectionPool | null = null;

async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
  }
  return pool;
}

// Database service functions
export class DatabaseService {
  
  /**
   * Get insurance products filtered by type, age, and gender
   */
  static async getInsuranceProducts(
    productType: string,
    age?: number,
    gender?: string
  ): Promise<InsuranceProduct[]> {
    try {
      const connection = await getConnection();
      const request = connection.request();
      
      let query = `
        SELECT * FROM insurance_products 
        WHERE product_type = @productType AND is_active = 1
      `;
      
      request.input('productType', sql.NVarChar, productType);

      // Filter by age if provided
      if (age) {
        query += ` AND min_age <= @age AND max_age >= @age`;
        request.input('age', sql.Int, age);
      }

      // Filter by gender if provided
      if (gender) {
        query += ` AND (target_gender = @gender OR target_gender = 'all')`;
        request.input('gender', sql.NVarChar, gender);
      }

      query += ` ORDER BY premium_amount ASC`;

      const result = await request.query(query);
      return result.recordset || [];
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  }

  /**
   * Store customer data with validation
   */
  static async storeCustomer(customerData: any): Promise<number | null> {
    try {
      // Validate required fields based on insurance type
      this.validateCustomerData(customerData);

      const connection = await getConnection();
      const request = connection.request();

      // Format data according to database schema
      const formattedData: Partial<Customer> = {
        name: customerData.name?.trim(),
        email: customerData.email?.toLowerCase().trim(),
        phone: customerData.phone?.trim(),
        zip_code: customerData.zipCode?.trim(),
        insurance_type: customerData.insuranceType,
        current_provider: customerData.currentProvider?.trim() || null,
        lead_source: 'website'
      };

      // Add type-specific fields
      switch (customerData.insuranceType) {
        case 'auto':
          formattedData.vehicle_number = customerData.vehicleNumber?.trim();
          formattedData.vehicle_model = customerData.vehicleModel?.trim();
          formattedData.vehicle_year = parseInt(customerData.vehicleYear);
          break;
          
        case 'health':
          formattedData.age = parseInt(customerData.age);
          formattedData.gender = customerData.gender;
          formattedData.medical_history = customerData.medicalHistory?.trim() || null;
          break;
          
        case 'term_life':
          formattedData.age = parseInt(customerData.lifeAge || customerData.age);
          formattedData.gender = customerData.lifeGender || customerData.gender;
          formattedData.coverage_amount = customerData.coverageAmount?.trim();
          formattedData.relationship = customerData.relationship;
          break;
          
        case 'savings':
          formattedData.age = parseInt(customerData.savingsAge || customerData.age);
          formattedData.gender = customerData.savingsGender || customerData.gender;
          formattedData.monthly_investment = customerData.monthlyInvestment?.trim();
          formattedData.investment_goal = customerData.investmentGoal?.trim();
          break;
          
        case 'home':
          formattedData.age = parseInt(customerData.age);
          formattedData.gender = customerData.gender;
          break;
      }

      // Build INSERT query
      const columns = Object.keys(formattedData).filter(key => formattedData[key as keyof Customer] !== undefined);
      const values = columns.map(col => `@${col}`).join(', ');
      const columnNames = columns.join(', ');

      const query = `
        INSERT INTO customers (${columnNames})
        OUTPUT INSERTED.customer_id
        VALUES (${values})
      `;

      // Add parameters
      columns.forEach(col => {
        const value = formattedData[col as keyof Customer];
        if (typeof value === 'number') {
          request.input(col, sql.Int, value);
        } else {
          request.input(col, sql.NVarChar, value);
        }
      });

      const result = await request.query(query);
      return result.recordset[0]?.customer_id || null;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  /**
   * Validate customer data based on insurance type
   */
  private static validateCustomerData(customerData: any): void {
    // Basic validation
    if (!customerData.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!customerData.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!customerData.phone?.trim()) {
      throw new Error('Phone is required');
    }
    if (!customerData.zipCode?.trim()) {
      throw new Error('ZIP code is required');
    }
    if (!customerData.insuranceType) {
      throw new Error('Insurance type is required');
    }

    // Email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(customerData.email)) {
      throw new Error('Invalid email format');
    }

    // Phone format validation (basic)
    if (customerData.phone.length < 10) {
      throw new Error('Phone number must be at least 10 digits');
    }

    // Type-specific validation
    switch (customerData.insuranceType) {
      case 'auto':
        if (!customerData.vehicleNumber?.trim()) {
          throw new Error('Vehicle number is required for auto insurance');
        }
        if (!customerData.vehicleModel?.trim()) {
          throw new Error('Vehicle model is required for auto insurance');
        }
        if (!customerData.vehicleYear || isNaN(parseInt(customerData.vehicleYear))) {
          throw new Error('Valid vehicle year is required for auto insurance');
        }
        break;
        
      case 'health':
      case 'term_life':
      case 'savings':
      case 'home':
        const ageField = customerData.lifeAge || customerData.savingsAge || customerData.age;
        const genderField = customerData.lifeGender || customerData.savingsGender || customerData.gender;
        
        if (!ageField || isNaN(parseInt(ageField))) {
          throw new Error('Valid age is required');
        }
        if (!genderField) {
          throw new Error('Gender is required');
        }
        
        if (customerData.insuranceType === 'term_life') {
          if (!customerData.coverageAmount?.trim()) {
            throw new Error('Coverage amount is required for term life insurance');
          }
          if (!customerData.relationship) {
            throw new Error('Relationship is required for term life insurance');
          }
        }
        
        if (customerData.insuranceType === 'savings') {
          if (!customerData.monthlyInvestment?.trim()) {
            throw new Error('Monthly investment is required for savings plans');
          }
          if (!customerData.investmentGoal?.trim()) {
            throw new Error('Investment goal is required for savings plans');
          }
        }
        break;
    }
  }

  /**
   * Create conversation history record
   */
  static async createConversationHistory(
    customerId: number,
    sessionId: string
  ): Promise<number | null> {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        INSERT INTO customer_conversations (customer_id, session_id, messages, conversation_status)
        OUTPUT INSERTED.conversation_id
        VALUES (@customerId, @sessionId, @messages, @status)
      `;

      request.input('customerId', sql.Int, customerId);
      request.input('sessionId', sql.NVarChar, sessionId);
      request.input('messages', sql.NVarChar, '[]');
      request.input('status', sql.NVarChar, 'active');

      const result = await request.query(query);
      return result.recordset[0]?.conversation_id || null;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  /**
   * Update conversation history with new messages
   */
  static async updateConversationHistory(
    conversationId: number,
    messages: Array<{ role: string; content: string; timestamp: string }>
  ): Promise<boolean> {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        UPDATE customer_conversations 
        SET messages = @messages
        WHERE conversation_id = @conversationId
      `;

      request.input('conversationId', sql.Int, conversationId);
      request.input('messages', sql.NVarChar, JSON.stringify(messages));

      await request.query(query);
      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  /**
   * End conversation
   */
  static async endConversation(conversationId: number): Promise<boolean> {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        UPDATE customer_conversations 
        SET conversation_status = @status, ended_at = GETDATE()
        WHERE conversation_id = @conversationId
      `;

      request.input('conversationId', sql.Int, conversationId);
      request.input('status', sql.NVarChar, 'completed');

      await request.query(query);
      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomer(customerId: number): Promise<Customer | null> {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `SELECT * FROM customers WHERE customer_id = @customerId`;
      request.input('customerId', sql.Int, customerId);

      const result = await request.query(query);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  /**
   * Update customer status
   */
  static async updateCustomerStatus(
    customerId: number, 
    status: 'active' | 'quoted' | 'converted' | 'inactive'
  ): Promise<boolean> {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        UPDATE customers 
        SET status = @status
        WHERE customer_id = @customerId
      `;

      request.input('customerId', sql.Int, customerId);
      request.input('status', sql.NVarChar, status);

      await request.query(query);
      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }
}

// Cleanup connection on app termination
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});