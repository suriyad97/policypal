import sql from 'mssql';

// Azure SQL Database configuration
const dbConfig = {
  server: 'ml-lms-db.database.windows.net',
  database: 'lms-db',
  user: 'lmsadmin-001',
  password: 'Creative@2025',
  options: {
    encrypt: true, // Use encryption for Azure SQL
    trustServerCertificate: false, // For Azure SQL
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Database connection pool
let pool = null;

async function getConnection() {
  if (!pool) {
    try {
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('✅ Connected to Azure SQL Database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }
  return pool;
}

// Database service class
export class DatabaseService {
  
  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const connection = await getConnection();
      const result = await connection.request().query('SELECT 1 as test');
      return result.recordset.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get insurance products filtered by type, age, and gender
   */
  async getInsuranceProducts(productType, age, gender) {
    try {
      const connection = await getConnection();
      const request = connection.request();
      
      let query = `
        SELECT 
          product_id,
          product_name,
          product_type,
          target_gender,
          min_age,
          max_age,
          premium_amount,
          coverage_details,
          provider_name,
          features,
          is_active,
          created_at,
          updated_at
        FROM insurance_products 
        WHERE is_active = 1
      `;
      
      // Add filters
      if (productType) {
        query += ` AND product_type = @productType`;
        request.input('productType', sql.NVarChar, productType);
      }

      if (age) {
        query += ` AND min_age <= @age AND max_age >= @age`;
        request.input('age', sql.Int, parseInt(age));
      }

      if (gender) {
        query += ` AND (target_gender = @gender OR target_gender = 'all')`;
        request.input('gender', sql.NVarChar, gender.toLowerCase());
      }

      query += ` ORDER BY premium_amount ASC`;

      console.log('Executing query:', query);
      const result = await request.query(query);
      
      // Parse JSON fields if they exist
      const products = result.recordset.map(product => {
        if (product.features) {
          try {
            product.features = JSON.parse(product.features);
          } catch (e) {
            product.features = {};
          }
        }
        return product;
      });

      console.log(`Found ${products.length} products`);
      return products;
    } catch (error) {
      console.error('Database error in getInsuranceProducts:', error);
      throw error;
    }
  }

  /**
   * Store customer data with validation and field mapping
   */
  async storeCustomer(customerData) {
    try {
      console.log('Storing customer data:', customerData);
      
      // Validate required fields
      this.validateCustomerData(customerData);

      const connection = await getConnection();
      const request = connection.request();

      // Map frontend fields to database fields
      const mappedData = this.mapCustomerFields(customerData);
      
      console.log('Mapped customer data:', mappedData);

      // Build dynamic INSERT query
      const columns = Object.keys(mappedData).filter(key => mappedData[key] !== undefined && mappedData[key] !== null);
      const values = columns.map(col => `@${col}`).join(', ');
      const columnNames = columns.join(', ');

      const query = `
        INSERT INTO customers (${columnNames})
        OUTPUT INSERTED.customer_id
        VALUES (${values})
      `;

      // Add parameters
      columns.forEach(col => {
        const value = mappedData[col];
        if (typeof value === 'number') {
          request.input(col, sql.Int, value);
        } else if (typeof value === 'string') {
          request.input(col, sql.NVarChar, value);
        } else {
          request.input(col, sql.NVarChar, String(value));
        }
      });

      console.log('Executing customer insert query:', query);
      const result = await request.query(query);
      const customerId = result.recordset[0]?.customer_id;
      
      if (!customerId) {
        throw new Error('Failed to get customer ID from insert operation');
      }
      
      console.log('✅ Customer stored successfully with ID:', customerId);
      return customerId;
    } catch (error) {
      console.error('❌ Database error in storeCustomer:', error);
      throw error;
    }
  }

  /**
   * Map frontend field names to database field names
   */
  mapCustomerFields(customerData) {
    const mapped = {
      name: customerData.name?.trim(),
      email: customerData.email?.toLowerCase().trim(),
      phone: customerData.phone?.trim(),
      zip_code: customerData.zipCode?.trim(),
      insurance_type: this.mapInsuranceType(customerData.insuranceType),
      current_provider: customerData.currentProvider?.trim() || null,
      lead_source: 'website'
    };

    // Add demographics
    if (customerData.age) {
      mapped.age = parseInt(customerData.age);
    }
    if (customerData.lifeAge) {
      mapped.age = parseInt(customerData.lifeAge);
    }
    if (customerData.savingsAge) {
      mapped.age = parseInt(customerData.savingsAge);
    }

    if (customerData.gender) {
      mapped.gender = customerData.gender.toLowerCase();
    }
    if (customerData.lifeGender) {
      mapped.gender = customerData.lifeGender.toLowerCase();
    }
    if (customerData.savingsGender) {
      mapped.gender = customerData.savingsGender.toLowerCase();
    }

    // Add insurance-specific fields
    const insuranceType = mapped.insurance_type;
    
    if (insuranceType === 'auto') {
      mapped.vehicle_number = customerData.vehicleNumber?.trim();
      mapped.vehicle_model = customerData.vehicleModel?.trim();
      if (customerData.vehicleYear) {
        mapped.vehicle_year = parseInt(customerData.vehicleYear);
      }
    }
    
    if (insuranceType === 'health') {
      mapped.medical_history = customerData.medicalHistory?.trim() || null;
    }
    
    if (insuranceType === 'term_life') {
      mapped.coverage_amount = customerData.coverageAmount?.trim();
      mapped.relationship = customerData.relationship;
    }
    
    if (insuranceType === 'savings') {
      mapped.monthly_investment = customerData.monthlyInvestment?.trim();
      mapped.investment_goal = customerData.investmentGoal?.trim();
    }

    return mapped;
  }

  /**
   * Map frontend insurance types to database values
   */
  mapInsuranceType(frontendType) {
    const mapping = {
      'car': 'auto',
      'term': 'term_life',
      'auto': 'auto',
      'health': 'health',
      'term_life': 'term_life',
      'savings': 'savings',
      'home': 'home'
    };
    return mapping[frontendType?.toLowerCase()] || frontendType?.toLowerCase();
  }

  /**
   * Validate customer data based on insurance type
   */
  validateCustomerData(customerData) {
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

    // Phone format validation
    if (customerData.phone.replace(/\D/g, '').length < 10) {
      throw new Error('Phone number must be at least 10 digits');
    }

    // Type-specific validation
    const insuranceType = this.mapInsuranceType(customerData.insuranceType);
    
    if (insuranceType === 'auto') {
      if (!customerData.vehicleNumber?.trim()) {
        throw new Error('Vehicle number is required for auto insurance');
      }
      if (!customerData.vehicleModel?.trim()) {
        throw new Error('Vehicle model is required for auto insurance');
      }
      if (!customerData.vehicleYear || isNaN(parseInt(customerData.vehicleYear))) {
        throw new Error('Valid vehicle year is required for auto insurance');
      }
    }
    
    if (['health', 'term_life', 'savings', 'home'].includes(insuranceType)) {
      const age = parseInt(customerData.age || customerData.lifeAge || customerData.savingsAge);
      const gender = customerData.gender || customerData.lifeGender || customerData.savingsGender;
      
      if (!age || isNaN(age) || age < 18 || age > 80) {
        throw new Error('Valid age between 18 and 80 is required');
      }
      if (!gender) {
        throw new Error('Gender is required');
      }
      
      if (insuranceType === 'term_life') {
        if (!customerData.coverageAmount?.trim()) {
          throw new Error('Coverage amount is required for term life insurance');
        }
        if (!customerData.relationship) {
          throw new Error('Relationship is required for term life insurance');
        }
      }
      
      if (insuranceType === 'savings') {
        if (!customerData.monthlyInvestment?.trim()) {
          throw new Error('Monthly investment is required for savings plans');
        }
        if (!customerData.investmentGoal?.trim()) {
          throw new Error('Investment goal is required for savings plans');
        }
      }
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId) {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `SELECT * FROM customers WHERE customer_id = @customerId`;
      request.input('customerId', sql.Int, customerId);

      const result = await request.query(query);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Database error in getCustomer:', error);
      throw error;
    }
  }

  /**
   * Create conversation history record
   */
  async createConversationHistory(customerId, sessionId) {
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
      console.error('Database error in createConversationHistory:', error);
      return null;
    }
  }

  /**
   * Update conversation history with new messages
   */
  async updateConversationHistory(conversationId, messages) {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        UPDATE customer_conversations 
        SET messages = @messages, updated_at = GETDATE()
        WHERE conversation_id = @conversationId
      `;

      request.input('conversationId', sql.Int, conversationId);
      request.input('messages', sql.NVarChar, JSON.stringify(messages));

      await request.query(query);
      return true;
    } catch (error) {
      console.error('Database error in updateConversationHistory:', error);
      return false;
    }
  }

  /**
   * End conversation
   */
  async endConversation(conversationId) {
    try {
      const connection = await getConnection();
      const request = connection.request();

      const query = `
        UPDATE customer_conversations 
        SET conversation_status = @status, ended_at = GETDATE(), updated_at = GETDATE()
        WHERE conversation_id = @conversationId
      `;

      request.input('conversationId', sql.Int, conversationId);
      request.input('status', sql.NVarChar, 'completed');

      await request.query(query);
      return true;
    } catch (error) {
      console.error('Database error in endConversation:', error);
      return false;
    }
  }
}

// Cleanup connection on app termination
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (pool) {
    await pool.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});