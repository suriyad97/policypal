import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface InsuranceProduct {
  id: string;
  product_type: 'car' | 'health' | 'term' | 'savings';
  provider_name: string;
  product_name: string;
  base_premium: number;
  coverage_amount?: string;
  features: Record<string, any>;
  eligibility_criteria: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoCustomer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  zip_code: string;
  vehicle_number: string;
  vehicle_model: string;
  vehicle_year: string;
  current_provider?: string;
  status?: 'active' | 'quoted' | 'converted';
  created_at?: string;
  updated_at?: string;
}

export interface HealthCustomer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  zip_code: string;
  age: string;
  gender: 'Male' | 'Female';
  medical_history?: string;
  current_provider?: string;
  status?: 'active' | 'quoted' | 'converted';
  created_at?: string;
  updated_at?: string;
}

export interface TermCustomer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  zip_code: string;
  life_age: string;
  life_gender: 'Male' | 'Female';
  coverage_amount: string;
  relationship: 'self' | 'spouse' | 'parents';
  current_provider?: string;
  status?: 'active' | 'quoted' | 'converted';
  created_at?: string;
  updated_at?: string;
}

export interface SavingsCustomer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  zip_code: string;
  savings_age: string;
  savings_gender: 'Male' | 'Female';
  monthly_investment: string;
  investment_goal: string;
  current_provider?: string;
  status?: 'active' | 'quoted' | 'converted';
  created_at?: string;
  updated_at?: string;
}

export interface ConversationHistory {
  id?: string;
  customer_id: string;
  customer_type: 'auto' | 'health' | 'term' | 'savings';
  session_id: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  status?: 'active' | 'completed' | 'abandoned';
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Database service functions
export class DatabaseService {
  // Get insurance products by type
  static async getInsuranceProducts(productType: string): Promise<InsuranceProduct[]> {
    const { data, error } = await supabase
      .from('insurance_products')
      .select('*')
      .eq('product_type', productType)
      .eq('is_active', true)
      .order('base_premium', { ascending: true });

    if (error) {
      console.error('Error fetching insurance products:', error);
      return [];
    }

    return data || [];
  }

  // Store customer data based on insurance type
  static async storeCustomer(customerData: any, insuranceType: string): Promise<string | null> {
    let tableName = '';
    let formattedData = {};

    switch (insuranceType) {
      case 'car':
        tableName = 'auto_customers';
        formattedData = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          zip_code: customerData.zipCode,
          vehicle_number: customerData.vehicleNumber,
          vehicle_model: customerData.vehicleModel,
          vehicle_year: customerData.vehicleYear,
          current_provider: customerData.currentProvider
        };
        break;
      case 'health':
        tableName = 'health_customers';
        formattedData = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          zip_code: customerData.zipCode,
          age: customerData.age,
          gender: customerData.gender,
          medical_history: customerData.medicalHistory,
          current_provider: customerData.currentProvider
        };
        break;
      case 'term':
        tableName = 'term_customers';
        formattedData = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          zip_code: customerData.zipCode,
          life_age: customerData.lifeAge,
          life_gender: customerData.lifeGender,
          coverage_amount: customerData.coverageAmount,
          relationship: customerData.relationship,
          current_provider: customerData.currentProvider
        };
        break;
      case 'savings':
        tableName = 'savings_customers';
        formattedData = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          zip_code: customerData.zipCode,
          savings_age: customerData.savingsAge,
          savings_gender: customerData.savingsGender,
          monthly_investment: customerData.monthlyInvestment,
          investment_goal: customerData.investmentGoal,
          current_provider: customerData.currentProvider
        };
        break;
      default:
        console.error('Invalid insurance type:', insuranceType);
        return null;
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert([formattedData])
      .select('id')
      .single();

    if (error) {
      console.error('Error storing customer data:', error);
      return null;
    }

    return data?.id || null;
  }

  // Create conversation history record
  static async createConversationHistory(
    customerId: string,
    customerType: string,
    sessionId: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('conversation_history')
      .insert([{
        customer_id: customerId,
        customer_type: customerType,
        session_id: sessionId,
        messages: [],
        status: 'active'
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation history:', error);
      return null;
    }

    return data?.id || null;
  }

  // Update conversation history with new messages
  static async updateConversationHistory(
    conversationId: string,
    messages: Array<{ role: string; content: string; timestamp: string }>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('conversation_history')
      .update({
        messages: messages,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation history:', error);
      return false;
    }

    return true;
  }

  // End conversation
  static async endConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversation_history')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error ending conversation:', error);
      return false;
    }

    return true;
  }
}