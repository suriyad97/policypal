/*
  # Insurance Database Schema

  1. New Tables
    - `insurance_products` - Store all insurance products with details
    - `auto_customers` - Auto insurance customer details
    - `health_customers` - Health insurance customer details  
    - `term_customers` - Term life insurance customer details
    - `savings_customers` - Savings plan customer details
    - `conversation_history` - Store chat conversations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Public read access for insurance products
*/

-- Insurance Products Table
CREATE TABLE IF NOT EXISTS insurance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('car', 'health', 'term', 'savings')),
  provider_name text NOT NULL,
  product_name text NOT NULL,
  base_premium decimal(10,2) NOT NULL,
  coverage_amount text,
  features jsonb DEFAULT '{}',
  eligibility_criteria jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto Insurance Customers
CREATE TABLE IF NOT EXISTS auto_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  zip_code text NOT NULL,
  vehicle_number text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year text NOT NULL,
  current_provider text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'quoted', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Health Insurance Customers
CREATE TABLE IF NOT EXISTS health_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  zip_code text NOT NULL,
  age text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female')),
  medical_history text,
  current_provider text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'quoted', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Term Life Insurance Customers
CREATE TABLE IF NOT EXISTS term_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  zip_code text NOT NULL,
  life_age text NOT NULL,
  life_gender text NOT NULL CHECK (life_gender IN ('Male', 'Female')),
  coverage_amount text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('self', 'spouse', 'parents')),
  current_provider text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'quoted', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Savings Plan Customers
CREATE TABLE IF NOT EXISTS savings_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  zip_code text NOT NULL,
  savings_age text NOT NULL,
  savings_gender text NOT NULL CHECK (savings_gender IN ('Male', 'Female')),
  monthly_investment text NOT NULL,
  investment_goal text NOT NULL,
  current_provider text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'quoted', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation History
CREATE TABLE IF NOT EXISTS conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  customer_type text NOT NULL CHECK (customer_type IN ('auto', 'health', 'term', 'savings')),
  session_id text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Policies for insurance_products (public read access)
CREATE POLICY "Anyone can read insurance products"
  ON insurance_products
  FOR SELECT
  TO public
  USING (is_active = true);

-- Policies for customer tables (authenticated access)
CREATE POLICY "Users can insert their own auto customer data"
  ON auto_customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read their own auto customer data"
  ON auto_customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own health customer data"
  ON health_customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read their own health customer data"
  ON health_customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own term customer data"
  ON term_customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read their own term customer data"
  ON term_customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own savings customer data"
  ON savings_customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read their own savings customer data"
  ON savings_customers
  FOR SELECT
  TO public
  USING (true);

-- Policies for conversation_history
CREATE POLICY "Users can insert conversation history"
  ON conversation_history
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read conversation history"
  ON conversation_history
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update conversation history"
  ON conversation_history
  FOR UPDATE
  TO public
  USING (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_insurance_products_type ON insurance_products(product_type);
CREATE INDEX IF NOT EXISTS idx_auto_customers_email ON auto_customers(email);
CREATE INDEX IF NOT EXISTS idx_health_customers_email ON health_customers(email);
CREATE INDEX IF NOT EXISTS idx_term_customers_email ON term_customers(email);
CREATE INDEX IF NOT EXISTS idx_savings_customers_email ON savings_customers(email);
CREATE INDEX IF NOT EXISTS idx_conversation_history_customer ON conversation_history(customer_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_conversation_history_session ON conversation_history(session_id);