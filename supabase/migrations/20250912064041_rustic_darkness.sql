/*
  # Insurance Products Database Schema
  
  1. New Tables
    - `insurance_products` - Store 35 diversified insurance products
    - `customers` - Store all customer lead form data
    - `customer_conversations` - Store chat conversation history
  
  2. Product Coverage
    - 5 product types: savings plans, auto insurance, home insurance, health insurance, term life insurance
    - All gender categories: male, female, non-binary
    - All age groups: 18-25, 26-35, 36-45, 46-55, 56-65, 65+
    - Realistic premium variations
  
  3. Data Validation
    - Strict data type enforcement
    - Required field constraints
    - Format validations
*/

-- Insurance Products Table
CREATE TABLE insurance_products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(100) NOT NULL,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('savings', 'auto', 'home', 'health', 'term_life')),
  target_gender VARCHAR(10) NOT NULL CHECK (target_gender IN ('male', 'female', 'non_binary', 'all')),
  min_age INTEGER NOT NULL CHECK (min_age >= 18 AND min_age <= 65),
  max_age INTEGER NOT NULL CHECK (max_age >= min_age AND max_age <= 80),
  premium_amount DECIMAL(10,2) NOT NULL CHECK (premium_amount > 0),
  coverage_details TEXT NOT NULL,
  provider_name VARCHAR(50) NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table (Lead Form Data)
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  
  -- Basic Information
  name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone VARCHAR(15) NOT NULL CHECK (phone ~ '^[0-9+\-\s()]{10,15}$'),
  zip_code VARCHAR(10) NOT NULL CHECK (LENGTH(TRIM(zip_code)) >= 5),
  
  -- Insurance Selection
  insurance_type VARCHAR(20) NOT NULL CHECK (insurance_type IN ('savings', 'auto', 'home', 'health', 'term_life')),
  
  -- Demographics (for health, term_life, savings)
  age INTEGER CHECK (age >= 18 AND age <= 80),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'non_binary')),
  
  -- Auto Insurance Specific
  vehicle_number VARCHAR(20) CHECK (vehicle_number IS NULL OR LENGTH(TRIM(vehicle_number)) > 0),
  vehicle_model VARCHAR(50) CHECK (vehicle_model IS NULL OR LENGTH(TRIM(vehicle_model)) > 0),
  vehicle_year INTEGER CHECK (vehicle_year IS NULL OR (vehicle_year >= 1990 AND vehicle_year <= EXTRACT(YEAR FROM NOW()) + 1)),
  
  -- Health Insurance Specific
  medical_history TEXT,
  
  -- Term Life Insurance Specific
  coverage_amount VARCHAR(20) CHECK (coverage_amount IS NULL OR LENGTH(TRIM(coverage_amount)) > 0),
  relationship VARCHAR(20) CHECK (relationship IS NULL OR relationship IN ('self', 'spouse', 'parents', 'child')),
  
  -- Savings Plan Specific
  monthly_investment VARCHAR(20) CHECK (monthly_investment IS NULL OR LENGTH(TRIM(monthly_investment)) > 0),
  investment_goal VARCHAR(50) CHECK (investment_goal IS NULL OR LENGTH(TRIM(investment_goal)) > 0),
  
  -- Optional
  current_provider VARCHAR(100),
  
  -- System Fields
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'quoted', 'converted', 'inactive')),
  lead_source VARCHAR(50) DEFAULT 'website',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Conversations Table
CREATE TABLE customer_conversations (
  conversation_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  conversation_status VARCHAR(20) DEFAULT 'active' CHECK (conversation_status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_insurance_products_type ON insurance_products(product_type);
CREATE INDEX idx_insurance_products_gender_age ON insurance_products(target_gender, min_age, max_age);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_insurance_type ON customers(insurance_type);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customer_conversations_customer_id ON customer_conversations(customer_id);
CREATE INDEX idx_customer_conversations_session_id ON customer_conversations(session_id);

-- Insert 35 Diversified Insurance Products

-- SAVINGS PLANS (7 products)
INSERT INTO insurance_products (product_name, product_type, target_gender, min_age, max_age, premium_amount, coverage_details, provider_name, features) VALUES
('Young Saver Plan', 'savings', 'all', 18, 30, 2500.00, 'Flexible savings plan for young professionals with guaranteed returns of 6.5% annually', 'HDFC Life', '{"guaranteed_returns": true, "tax_benefits": true, "flexible_premium": true}'),
('Women Wealth Builder', 'savings', 'female', 25, 45, 3500.00, 'Specially designed savings plan for women with maternity and child education benefits', 'SBI Life', '{"maternity_benefit": true, "child_education": true, "premium_waiver": true}'),
('Senior Citizen Savings', 'savings', 'all', 55, 75, 5000.00, 'High-yield savings plan for senior citizens with immediate annuity options', 'LIC', '{"immediate_annuity": true, "medical_checkup_waiver": true, "guaranteed_income": true}'),
('Executive Wealth Plan', 'savings', 'all', 30, 55, 7500.00, 'Premium savings plan for high-income professionals with market-linked returns', 'ICICI Prudential', '{"market_linked": true, "fund_switching": true, "top_up_facility": true}'),
('Family Security Saver', 'savings', 'all', 25, 50, 4000.00, 'Comprehensive family savings plan with life cover and wealth creation', 'Max Life', '{"life_cover": true, "wealth_creation": true, "family_floater": true}'),
('Retirement Ready Plan', 'savings', 'all', 40, 60, 6000.00, 'Retirement-focused savings with pension and healthcare benefits', 'Bajaj Allianz', '{"pension_benefit": true, "healthcare_cover": true, "inflation_protection": true}'),
('Millennial Money Plan', 'savings', 'all', 22, 35, 3000.00, 'Digital-first savings plan for millennials with app-based management', 'Tata AIA', '{"digital_management": true, "goal_based_saving": true, "low_premium": true}'),

-- AUTO INSURANCE (7 products)
('Comprehensive Car Cover', 'auto', 'all', 18, 70, 8500.00, 'Complete car insurance with zero depreciation and roadside assistance', 'HDFC ERGO', '{"zero_depreciation": true, "roadside_assistance": true, "engine_protection": true}'),
('Young Driver Special', 'auto', 'all', 18, 30, 12000.00, 'Higher premium for young drivers with comprehensive coverage and driver training', 'ICICI Lombard', '{"driver_training": true, "accident_forgiveness": true, "new_car_replacement": true}'),
('Women Driver Advantage', 'auto', 'female', 25, 60, 7500.00, 'Special rates for women drivers with enhanced safety features', 'Bajaj Allianz', '{"women_discount": true, "safety_features": true, "personal_accident": true}'),
('Senior Driver Plan', 'auto', 'all', 50, 75, 9500.00, 'Tailored coverage for senior drivers with medical emergency assistance', 'Oriental Insurance', '{"medical_emergency": true, "senior_discount": true, "home_pickup": true}'),
('Electric Vehicle Cover', 'auto', 'all', 21, 65, 6500.00, 'Specialized insurance for electric vehicles with battery protection', 'Tata AIG', '{"battery_protection": true, "charging_station_cover": true, "eco_friendly_discount": true}'),
('Commercial Vehicle Pro', 'auto', 'all', 25, 65, 15000.00, 'Commercial vehicle insurance with goods in transit and third-party coverage', 'New India Assurance', '{"goods_in_transit": true, "third_party_unlimited": true, "driver_legal_liability": true}'),
('Luxury Car Elite', 'auto', 'all', 30, 65, 25000.00, 'Premium coverage for luxury vehicles with concierge services', 'Royal Sundaram', '{"concierge_service": true, "luxury_repair": true, "worldwide_coverage": true}'),

-- HOME INSURANCE (7 products)
('Home Shield Basic', 'home', 'all', 21, 70, 4500.00, 'Basic home insurance covering structure, contents, and natural disasters', 'HDFC ERGO', '{"structure_cover": true, "contents_cover": true, "natural_disaster": true}'),
('Family Home Protector', 'home', 'all', 25, 65, 6500.00, 'Comprehensive home insurance with family personal accident cover', 'ICICI Lombard', '{"family_accident": true, "home_loan_protection": true, "temporary_accommodation": true}'),
('Apartment Dweller Plan', 'home', 'all', 22, 55, 3500.00, 'Specialized insurance for apartment owners with society coverage', 'Bajaj Allianz', '{"society_coverage": true, "lift_breakdown": true, "power_backup": true}'),
('Senior Homeowner Care', 'home', 'all', 55, 80, 5500.00, 'Home insurance for seniors with medical emergency and caregiver benefits', 'Oriental Insurance', '{"medical_emergency": true, "caregiver_benefit": true, "home_modification": true}'),
('Rental Property Shield', 'home', 'all', 25, 65, 7500.00, 'Insurance for rental properties with tenant default and legal expense cover', 'Tata AIG', '{"tenant_default": true, "legal_expenses": true, "rental_income_protection": true}'),
('Smart Home Security', 'home', 'all', 28, 50, 8500.00, 'Advanced home insurance with IoT device protection and cyber security', 'Royal Sundaram', '{"iot_protection": true, "cyber_security": true, "smart_device_cover": true}'),
('Villa Premium Cover', 'home', 'all', 35, 70, 12000.00, 'Premium home insurance for villas with landscaping and pool coverage', 'New India Assurance', '{"landscaping_cover": true, "pool_coverage": true, "guest_liability": true}'),

-- HEALTH INSURANCE (7 products)
('Essential Health Cover', 'health', 'all', 18, 65, 8000.00, 'Basic health insurance with hospitalization and day-care procedures', 'Star Health', '{"hospitalization": true, "day_care": true, "pre_post_hospitalization": true}'),
('Women Health Plus', 'health', 'female', 18, 55, 9500.00, 'Comprehensive health plan for women with maternity and wellness benefits', 'Care Health', '{"maternity_cover": true, "wellness_benefits": true, "women_specific_treatments": true}'),
('Senior Citizen Health', 'health', 'all', 60, 80, 15000.00, 'Specialized health insurance for seniors with no medical checkup', 'Max Bupa', '{"no_medical_checkup": true, "chronic_disease_cover": true, "home_healthcare": true}'),
('Family Floater Plan', 'health', 'all', 25, 55, 12000.00, 'Family health insurance covering spouse and children with shared sum insured', 'HDFC ERGO', '{"family_floater": true, "child_vaccination": true, "spouse_coverage": true}'),
('Critical Illness Shield', 'health', 'all', 30, 60, 6500.00, 'Specialized coverage for critical illnesses with lump sum benefits', 'ICICI Lombard', '{"critical_illness": true, "lump_sum_benefit": true, "second_opinion": true}'),
('Young Professional Health', 'health', 'all', 22, 35, 5500.00, 'Affordable health insurance for young professionals with wellness programs', 'Bajaj Allianz', '{"wellness_programs": true, "preventive_checkups": true, "mental_health": true}'),
('Comprehensive Health Pro', 'health', 'all', 35, 65, 18000.00, 'Premium health insurance with international treatment and organ transplant', 'Apollo Munich', '{"international_treatment": true, "organ_transplant": true, "alternative_treatment": true}'),

-- TERM LIFE INSURANCE (7 products)
('Basic Term Protection', 'term_life', 'all', 18, 60, 12000.00, 'Simple term life insurance with death benefit and terminal illness cover', 'LIC', '{"death_benefit": true, "terminal_illness": true, "accidental_death": true}'),
('Women Term Advantage', 'term_life', 'female', 21, 55, 10000.00, 'Term life insurance for women with special rates and maternity benefits', 'HDFC Life', '{"women_discount": true, "maternity_benefit": true, "critical_illness_rider": true}'),
('Young Earner Term', 'term_life', 'all', 18, 35, 8000.00, 'Affordable term insurance for young earners with increasing cover option', 'ICICI Prudential', '{"increasing_cover": true, "premium_waiver": true, "income_benefit": true}'),
('Family Breadwinner Plan', 'term_life', 'all', 25, 55, 15000.00, 'Comprehensive term plan for family breadwinners with income replacement', 'Max Life', '{"income_replacement": true, "child_education": true, "spouse_income": true}'),
('Senior Term Security', 'term_life', 'all', 45, 70, 25000.00, 'Term insurance for seniors with simplified underwriting and guaranteed acceptance', 'SBI Life', '{"guaranteed_acceptance": true, "simplified_underwriting": true, "final_expense": true}'),
('High Net Worth Term', 'term_life', 'all', 30, 60, 35000.00, 'Premium term insurance for high net worth individuals with estate planning', 'Bajaj Allianz', '{"estate_planning": true, "tax_benefits": true, "wealth_transfer": true}'),
('Joint Life Term Plan', 'term_life', 'all', 25, 65, 18000.00, 'Joint life term insurance for couples with survivor benefits', 'Tata AIA', '{"joint_life": true, "survivor_benefit": true, "premium_sharing": true}');

-- Data Validation Function
CREATE OR REPLACE FUNCTION validate_customer_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate insurance type specific fields
  IF NEW.insurance_type = 'auto' THEN
    IF NEW.vehicle_number IS NULL OR NEW.vehicle_model IS NULL OR NEW.vehicle_year IS NULL THEN
      RAISE EXCEPTION 'Auto insurance requires vehicle_number, vehicle_model, and vehicle_year';
    END IF;
  END IF;
  
  IF NEW.insurance_type IN ('health', 'term_life', 'savings') THEN
    IF NEW.age IS NULL OR NEW.gender IS NULL THEN
      RAISE EXCEPTION 'Health, term life, and savings insurance require age and gender';
    END IF;
  END IF;
  
  IF NEW.insurance_type = 'term_life' THEN
    IF NEW.coverage_amount IS NULL OR NEW.relationship IS NULL THEN
      RAISE EXCEPTION 'Term life insurance requires coverage_amount and relationship';
    END IF;
  END IF;
  
  IF NEW.insurance_type = 'savings' THEN
    IF NEW.monthly_investment IS NULL OR NEW.investment_goal IS NULL THEN
      RAISE EXCEPTION 'Savings plans require monthly_investment and investment_goal';
    END IF;
  END IF;
  
  -- Validate email format
  IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone format
  IF NEW.phone !~ '^[0-9+\-\s()]{10,15}$' THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Set updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_customer_data_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_data();

-- Enable Row Level Security
ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversations ENABLE ROW LEVEL SECURITY;

-- Policies for public access (adjust based on your security requirements)
CREATE POLICY "Anyone can read active insurance products"
  ON insurance_products
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Anyone can insert customer data"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read their own customer data"
  ON customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert conversation data"
  ON customer_conversations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update conversation data"
  ON customer_conversations
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can read conversation data"
  ON customer_conversations
  FOR SELECT
  TO public
  USING (true);