@@ .. @@
 -- Insurance Products Table
 CREATE TABLE insurance_products (
   product_id INT IDENTITY(1,1) PRIMARY KEY,
   product_name NVARCHAR(100) NOT NULL,
   product_type NVARCHAR(20) NOT NULL CHECK (product_type IN ('savings', 'auto', 'home', 'health', 'term_life')),
   target_gender NVARCHAR(10) NOT NULL CHECK (target_gender IN ('male', 'female', 'non_binary', 'all')),
   min_age INT NOT NULL CHECK (min_age >= 18 AND min_age <= 65),
   max_age INT NOT NULL CHECK (max_age >= min_age AND max_age <= 80),
   premium_amount DECIMAL(10,2) NOT NULL CHECK (premium_amount > 0),
   coverage_details NVARCHAR(MAX) NOT NULL,
   provider_name NVARCHAR(50) NOT NULL,
   features NVARCHAR(MAX) DEFAULT '{}',
   is_active BIT DEFAULT 1,
   created_at DATETIME2 DEFAULT GETDATE(),
   updated_at DATETIME2 DEFAULT GETDATE()
 );
 
 -- Customers Table (Lead Form Data)
 CREATE TABLE customers (
   customer_id INT IDENTITY(1,1) PRIMARY KEY,
   
   -- Basic Information
   name NVARCHAR(100) NOT NULL CHECK (LEN(TRIM(name)) > 0),
   email NVARCHAR(255) NOT NULL CHECK (email LIKE '%_@_%._%'),
   phone NVARCHAR(15) NOT NULL CHECK (LEN(phone) >= 10),
   zip_code NVARCHAR(10) NOT NULL CHECK (LEN(TRIM(zip_code)) >= 5),
   
   -- Insurance Selection
   insurance_type NVARCHAR(20) NOT NULL CHECK (insurance_type IN ('savings', 'auto', 'home', 'health', 'term_life')),
   
   -- Demographics (for health, term_life, savings)
   age INT CHECK (age >= 18 AND age <= 80),
   gender NVARCHAR(10) CHECK (gender IN ('male', 'female', 'non_binary')),