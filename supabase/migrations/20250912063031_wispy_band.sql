/*
  # Seed Insurance Products Data

  Sample insurance products for each category to demonstrate the system
*/

-- Auto Insurance Products
INSERT INTO insurance_products (product_type, provider_name, product_name, base_premium, coverage_amount, features, eligibility_criteria) VALUES
('car', 'HDFC ERGO', 'Comprehensive Car Insurance', 8500.00, '₹5 Lakh', 
 '{"zero_depreciation": true, "roadside_assistance": true, "engine_protection": true}',
 '{"min_age": 18, "max_age": 75, "vehicle_age_limit": 15}'),
('car', 'ICICI Lombard', 'Motor Complete Protection', 7800.00, '₹3 Lakh',
 '{"personal_accident": true, "theft_protection": true, "natural_calamity": true}',
 '{"min_age": 21, "max_age": 70, "vehicle_age_limit": 10}'),
('car', 'Bajaj Allianz', 'Car Insurance Plus', 9200.00, '₹10 Lakh',
 '{"consumables_cover": true, "key_replacement": true, "tyre_protection": true}',
 '{"min_age": 18, "max_age": 65, "vehicle_age_limit": 12}');

-- Health Insurance Products  
INSERT INTO insurance_products (product_type, provider_name, product_name, base_premium, coverage_amount, features, eligibility_criteria) VALUES
('health', 'Star Health', 'Comprehensive Health Insurance', 12000.00, '₹5 Lakh',
 '{"cashless_hospitals": 9000, "pre_post_hospitalization": true, "day_care_procedures": true}',
 '{"min_age": 18, "max_age": 65, "waiting_period": "2_years"}'),
('health', 'Max Bupa', 'Health Companion', 15000.00, '₹10 Lakh',
 '{"wellness_benefits": true, "mental_health_cover": true, "maternity_cover": true}',
 '{"min_age": 21, "max_age": 70, "waiting_period": "1_year"}'),
('health', 'Care Health', 'Care Supreme', 10500.00, '₹3 Lakh',
 '{"home_treatment": true, "alternative_treatment": true, "organ_donor_cover": true}',
 '{"min_age": 18, "max_age": 75, "waiting_period": "3_years"}'');

-- Term Life Insurance Products
INSERT INTO insurance_products (product_type, provider_name, product_name, base_premium, coverage_amount, features, eligibility_criteria) VALUES
('term', 'LIC', 'Tech Term Insurance', 18000.00, '₹1 Crore',
 '{"accidental_death_benefit": true, "terminal_illness_benefit": true, "premium_waiver": true}',
 '{"min_age": 18, "max_age": 65, "medical_checkup_required": true}'),
('term', 'HDFC Life', 'Click 2 Protect Plus', 16500.00, '₹50 Lakh',
 '{"life_stage_benefit": true, "income_benefit": true, "critical_illness_rider": true}',
 '{"min_age": 21, "max_age": 60, "medical_checkup_required": false}'),
('term', 'ICICI Prudential', 'iProtect Smart', 19200.00, '₹2 Crore',
 '{"increasing_cover": true, "return_of_premium": true, "disability_benefit": true}',
 '{"min_age": 18, "max_age": 70, "medical_checkup_required": true}');

-- Savings Plan Products
INSERT INTO insurance_products (product_type, provider_name, product_name, base_premium, coverage_amount, features, eligibility_criteria) VALUES
('savings', 'SBI Life', 'Smart Wealth Builder', 5000.00, 'Flexible',
 '{"guaranteed_returns": true, "tax_benefits": true, "partial_withdrawal": true}',
 '{"min_age": 18, "max_age": 60, "min_premium": 2000}'),
('savings', 'Max Life', 'Smart Wealth Plan', 7500.00, 'Market Linked',
 '{"fund_switching": true, "top_up_facility": true, "loyalty_additions": true}',
 '{"min_age": 21, "max_age": 55, "min_premium": 5000}'),
('savings', 'Bajaj Allianz', 'Goal Assure', 6000.00, 'Guaranteed',
 '{"maturity_guarantee": true, "death_benefit": true, "premium_holiday": true}',
 '{"min_age": 18, "max_age": 65, "min_premium": 3000}');