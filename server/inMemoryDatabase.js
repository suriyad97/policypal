// In-Memory Database for PolicyPal
// This provides fallback functionality when Azure SQL Database is unavailable

export class InMemoryDatabase {
  constructor() {
    this.customers = new Map();
    this.conversations = new Map();
    this.products = this.initializeProducts();
    this.nextCustomerId = 1;
    this.nextConversationId = 1;
  }

  // Initialize with sample insurance products
  initializeProducts() {
    return [
      // AUTO INSURANCE
      {
        product_id: 1,
        product_name: 'Comprehensive Car Cover',
        product_type: 'auto',
        target_gender: 'all',
        min_age: 18,
        max_age: 70,
        premium_amount: 8500.00,
        coverage_details: 'Complete car insurance with zero depreciation and roadside assistance',
        provider_name: 'HDFC ERGO',
        features: { zero_depreciation: true, roadside_assistance: true, engine_protection: true },
        is_active: true
      },
      {
        product_id: 2,
        product_name: 'Young Driver Special',
        product_type: 'auto',
        target_gender: 'all',
        min_age: 18,
        max_age: 30,
        premium_amount: 12000.00,
        coverage_details: 'Higher premium for young drivers with comprehensive coverage and driver training',
        provider_name: 'ICICI Lombard',
        features: { driver_training: true, accident_forgiveness: true, new_car_replacement: true },
        is_active: true
      },
      {
        product_id: 3,
        product_name: 'Women Driver Advantage',
        product_type: 'auto',
        target_gender: 'female',
        min_age: 25,
        max_age: 60,
        premium_amount: 7500.00,
        coverage_details: 'Special rates for women drivers with enhanced safety features',
        provider_name: 'Bajaj Allianz',
        features: { women_discount: true, safety_features: true, personal_accident: true },
        is_active: true
      },

      // HEALTH INSURANCE
      {
        product_id: 4,
        product_name: 'Essential Health Cover',
        product_type: 'health',
        target_gender: 'all',
        min_age: 18,
        max_age: 65,
        premium_amount: 8000.00,
        coverage_details: 'Basic health insurance with hospitalization and day-care procedures',
        provider_name: 'Star Health',
        features: { hospitalization: true, day_care: true, pre_post_hospitalization: true },
        is_active: true
      },
      {
        product_id: 5,
        product_name: 'Women Health Plus',
        product_type: 'health',
        target_gender: 'female',
        min_age: 18,
        max_age: 55,
        premium_amount: 9500.00,
        coverage_details: 'Comprehensive health plan for women with maternity and wellness benefits',
        provider_name: 'Care Health',
        features: { maternity_cover: true, wellness_benefits: true, women_specific_treatments: true },
        is_active: true
      },
      {
        product_id: 6,
        product_name: 'Family Floater Plan',
        product_type: 'health',
        target_gender: 'all',
        min_age: 25,
        max_age: 55,
        premium_amount: 12000.00,
        coverage_details: 'Family health insurance covering spouse and children with shared sum insured',
        provider_name: 'HDFC ERGO',
        features: { family_floater: true, child_vaccination: true, spouse_coverage: true },
        is_active: true
      },

      // TERM LIFE INSURANCE
      {
        product_id: 7,
        product_name: 'Basic Term Protection',
        product_type: 'term_life',
        target_gender: 'all',
        min_age: 18,
        max_age: 60,
        premium_amount: 12000.00,
        coverage_details: 'Simple term life insurance with death benefit and terminal illness cover',
        provider_name: 'LIC',
        features: { death_benefit: true, terminal_illness: true, accidental_death: true },
        is_active: true
      },
      {
        product_id: 8,
        product_name: 'Women Term Advantage',
        product_type: 'term_life',
        target_gender: 'female',
        min_age: 21,
        max_age: 55,
        premium_amount: 10000.00,
        coverage_details: 'Term life insurance for women with special rates and maternity benefits',
        provider_name: 'HDFC Life',
        features: { women_discount: true, maternity_benefit: true, critical_illness_rider: true },
        is_active: true
      },

      // SAVINGS PLANS
      {
        product_id: 9,
        product_name: 'Young Saver Plan',
        product_type: 'savings',
        target_gender: 'all',
        min_age: 18,
        max_age: 30,
        premium_amount: 2500.00,
        coverage_details: 'Flexible savings plan for young professionals with guaranteed returns of 6.5% annually',
        provider_name: 'HDFC Life',
        features: { guaranteed_returns: true, tax_benefits: true, flexible_premium: true },
        is_active: true
      },
      {
        product_id: 10,
        product_name: 'Executive Wealth Plan',
        product_type: 'savings',
        target_gender: 'all',
        min_age: 30,
        max_age: 55,
        premium_amount: 7500.00,
        coverage_details: 'Premium savings plan for high-income professionals with market-linked returns',
        provider_name: 'ICICI Prudential',
        features: { market_linked: true, fund_switching: true, top_up_facility: true },
        is_active: true
      },

      // HOME INSURANCE
      {
        product_id: 11,
        product_name: 'Home Shield Basic',
        product_type: 'home',
        target_gender: 'all',
        min_age: 21,
        max_age: 70,
        premium_amount: 4500.00,
        coverage_details: 'Basic home insurance covering structure, contents, and natural disasters',
        provider_name: 'HDFC ERGO',
        features: { structure_cover: true, contents_cover: true, natural_disaster: true },
        is_active: true
      },
      {
        product_id: 12,
        product_name: 'Family Home Protector',
        product_type: 'home',
        target_gender: 'all',
        min_age: 25,
        max_age: 65,
        premium_amount: 6500.00,
        coverage_details: 'Comprehensive home insurance with family personal accident cover',
        provider_name: 'ICICI Lombard',
        features: { family_accident: true, home_loan_protection: true, temporary_accommodation: true },
        is_active: true
      }
    ];
  }

  // Store customer data
  storeCustomer(customerData) {
    try {
      const customerId = this.nextCustomerId++;
      const customer = {
        customer_id: customerId,
        name: customerData.name?.trim(),
        email: customerData.email?.toLowerCase().trim(),
        phone: customerData.phone?.trim(),
        zip_code: customerData.zipCode?.trim(),
        insurance_type: this.mapInsuranceType(customerData.insuranceType),
        age: customerData.age ? parseInt(customerData.age) : null,
        gender: customerData.gender?.toLowerCase() || null,
        vehicle_number: customerData.vehicleNumber?.trim() || null,
        vehicle_model: customerData.vehicleModel?.trim() || null,
        vehicle_year: customerData.vehicleYear ? parseInt(customerData.vehicleYear) : null,
        medical_history: customerData.medicalHistory?.trim() || null,
        coverage_amount: customerData.coverageAmount?.trim() || null,
        relationship: customerData.relationship || null,
        monthly_investment: customerData.monthlyInvestment?.trim() || null,
        investment_goal: customerData.investmentGoal?.trim() || null,
        current_provider: customerData.currentProvider?.trim() || null,
        status: 'active',
        lead_source: 'website',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.customers.set(customerId, customer);
      console.log(`✅ Customer stored in memory with ID: ${customerId}`);
      return customerId;
    } catch (error) {
      console.error('❌ Error storing customer in memory:', error);
      throw error;
    }
  }

  // Get customer by ID
  getCustomer(customerId) {
    return this.customers.get(customerId) || null;
  }

  // Get insurance products with filtering
  getInsuranceProducts(productType, age, gender) {
    try {
      let filteredProducts = this.products.filter(product => product.is_active);

      // Filter by product type
      if (productType) {
        filteredProducts = filteredProducts.filter(product => 
          product.product_type === productType
        );
      }

      // Filter by age
      if (age) {
        const ageNum = parseInt(age);
        filteredProducts = filteredProducts.filter(product => 
          product.min_age <= ageNum && product.max_age >= ageNum
        );
      }

      // Filter by gender
      if (gender) {
        filteredProducts = filteredProducts.filter(product => 
          product.target_gender === 'all' || product.target_gender === gender.toLowerCase()
        );
      }

      // Sort by premium amount
      filteredProducts.sort((a, b) => a.premium_amount - b.premium_amount);

      console.log(`✅ Found ${filteredProducts.length} products in memory`);
      return filteredProducts;
    } catch (error) {
      console.error('❌ Error getting products from memory:', error);
      return [];
    }
  }

  // Create conversation history
  createConversationHistory(customerId, sessionId) {
    try {
      const conversationId = this.nextConversationId++;
      const conversation = {
        conversation_id: conversationId,
        customer_id: customerId,
        session_id: sessionId,
        messages: [],
        conversation_status: 'active',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.conversations.set(conversationId, conversation);
      console.log(`✅ Conversation created in memory with ID: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('❌ Error creating conversation in memory:', error);
      return null;
    }
  }

  // Update conversation history
  updateConversationHistory(conversationId, messages) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.messages = messages;
        conversation.updated_at = new Date().toISOString();
        this.conversations.set(conversationId, conversation);
        console.log(`✅ Conversation ${conversationId} updated in memory`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error updating conversation in memory:', error);
      return false;
    }
  }

  // End conversation
  endConversation(conversationId) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.conversation_status = 'completed';
        conversation.ended_at = new Date().toISOString();
        conversation.updated_at = new Date().toISOString();
        this.conversations.set(conversationId, conversation);
        console.log(`✅ Conversation ${conversationId} ended in memory`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error ending conversation in memory:', error);
      return false;
    }
  }

  // Map insurance types
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

  // Test connection (always returns true for in-memory)
  testConnection() {
    return true;
  }

  // Get all customers (for debugging)
  getAllCustomers() {
    return Array.from(this.customers.values());
  }

  // Get all conversations (for debugging)
  getAllConversations() {
    return Array.from(this.conversations.values());
  }

  // Clear all data (for testing)
  clearAll() {
    this.customers.clear();
    this.conversations.clear();
    this.nextCustomerId = 1;
    this.nextConversationId = 1;
    console.log('🧹 In-memory database cleared');
  }
}