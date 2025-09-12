import { supabase } from './supabase';

// Database types matching the new schema
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
  features: Record<string, any>;
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
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  conversation_status?: 'active' | 'completed' | 'abandoned';
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  updated_at?: string;
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
      let query = supabase
        .from('insurance_products')
        .select('*')
        .eq('product_type', productType)
        .eq('is_active', true);

      // Filter by age if provided
      if (age) {
        query = query.lte('min_age', age).gte('max_age', age);
      }

      // Filter by gender if provided
      if (gender) {
        query = query.or(`target_gender.eq.${gender},target_gender.eq.all`);
      }

      const { data, error } = await query.order('premium_amount', { ascending: true });

      if (error) {
        console.error('Error fetching insurance products:', error);
        throw new Error(`Failed to fetch insurance products: ${error.message}`);
      }

      return data || [];
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

      const { data, error } = await supabase
        .from('customers')
        .insert([formattedData])
        .select('customer_id')
        .single();

      if (error) {
        console.error('Error storing customer data:', error);
        throw new Error(`Failed to store customer data: ${error.message}`);
      }

      return data?.customer_id || null;
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

    // Phone format validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(customerData.phone)) {
      throw new Error('Invalid phone format');
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
      const { data, error } = await supabase
        .from('customer_conversations')
        .insert([{
          customer_id: customerId,
          session_id: sessionId,
          messages: [],
          conversation_status: 'active'
        }])
        .select('conversation_id')
        .single();

      if (error) {
        console.error('Error creating conversation history:', error);
        throw new Error(`Failed to create conversation history: ${error.message}`);
      }

      return data?.conversation_id || null;
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
      const { error } = await supabase
        .from('customer_conversations')
        .update({
          messages: messages,
          updated_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Error updating conversation history:', error);
        return false;
      }

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
      const { error } = await supabase
        .from('customer_conversations')
        .update({
          conversation_status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Error ending conversation:', error);
        return false;
      }

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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        return null;
      }

      return data;
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
      const { error } = await supabase
        .from('customers')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error updating customer status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }
}