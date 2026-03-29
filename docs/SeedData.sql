-- ============================================================
-- VerdeCrop Development Seed Data
-- Run AFTER running: dotnet ef database update
-- ============================================================
USE VerdeCropDB;
GO

-- Admin user (OTP: 123456 in dev mode)
INSERT INTO Users (Name, Email, Phone, Role, IsActive, IsEmailVerified, IsPhoneVerified, CreatedAt)
VALUES ('VerdeCrop Admin', 'admin@verdecrop.com', '+919999999999', 'admin', 1, 1, 1, GETUTCDATE());

-- Test farmer user
INSERT INTO Users (Name, Email, Phone, Role, IsActive, IsEmailVerified, IsPhoneVerified, CreatedAt)
VALUES ('Ramesh Sharma', 'farmer@verdecrop.com', '+919876543210', 'farmer', 1, 1, 1, GETUTCDATE());

-- Test customer
INSERT INTO Users (Name, Email, Phone, Role, IsActive, IsEmailVerified, IsPhoneVerified, CreatedAt)
VALUES ('Priya Singh', 'customer@verdecrop.com', '+919876543220', 'user', 1, 1, 1, GETUTCDATE());

-- Create cart for customer
INSERT INTO Carts (UserId, CreatedAt)
SELECT Id, GETUTCDATE() FROM Users WHERE Role = 'user';

-- Farmer profile
INSERT INTO FarmerProfiles (UserId, FarmName, Description, Location, State, PinCode, CertificationNumber, IsApproved, TotalSales, Rating, ReviewCount, CreatedAt)
SELECT Id, 'Sharma Organic Farm', 'Third-generation organic farmer from Haryana. Certified pesticide-free vegetables.', 
  'Karnal, Haryana', 'Haryana', '132001', 'CERT-HR-001', 1, 0, 4.8, 0, GETUTCDATE()
FROM Users WHERE Email = 'farmer@verdecrop.com';

-- Products
DECLARE @FarmerId INT = (SELECT fp.Id FROM FarmerProfiles fp JOIN Users u ON fp.UserId = u.Id WHERE u.Email = 'farmer@verdecrop.com');

INSERT INTO Products (Name, Slug, Description, CategoryId, FarmerId, Price, OriginalPrice, Unit, MinOrderQty, StockQuantity, IsOrganic, IsFeatured, IsActive, Rating, ReviewCount, CreatedAt)
VALUES
('Organic Tomatoes',    'organic-tomatoes',    'Sun-ripened, juicy tomatoes. No pesticides.',  1, @FarmerId, 60,  80,  'kg',   0.5, 200, 1, 1, 1, 4.7, 12, GETUTCDATE()),
('Baby Spinach',        'baby-spinach',        'Tender spinach leaves, harvested fresh daily.', 1, @FarmerId, 45,  55,  '250g', 1,   150, 1, 0, 1, 4.6, 8,  GETUTCDATE()),
('French Beans',        'french-beans',        'Crispy tender beans, rich in fibre.',           1, @FarmerId, 70,  90,  '500g', 1,   100, 1, 1, 1, 4.8, 15, GETUTCDATE()),
('Organic Potato',      'organic-potato',      'Desi aloo grown without synthetic fertilizers.',1, @FarmerId, 35,  45,  'kg',   1,   500, 1, 0, 1, 4.4, 20, GETUTCDATE()),
('Purple Cabbage',      'purple-cabbage',      'Antioxidant-rich purple cabbage.',              1, @FarmerId, 55,  65,  'kg',   0.5, 120, 1, 0, 1, 4.5, 6,  GETUTCDATE()),
('Organic Turmeric',    'organic-turmeric',    'Pure Lakadong turmeric, high curcumin.',        5, @FarmerId, 95,  120, '250g', 1,   100, 1, 1, 1, 4.9, 25, GETUTCDATE()),
('Basmati Rice',        'basmati-rice',        'Aged aromatic basmati, GI-certified.',          3, @FarmerId, 180, 220, 'kg',   1,   300, 1, 1, 1, 4.8, 30, GETUTCDATE()),
('Whole Wheat Atta',    'whole-wheat-atta',    'Stone-ground whole wheat, full nutrients.',     3, @FarmerId, 65,  80,  'kg',   1,   400, 1, 0, 1, 4.7, 22, GETUTCDATE());

-- Coupons
INSERT INTO Coupons (Code, Description, DiscountType, DiscountValue, MinOrderAmount, MaxDiscountAmount, UsageLimit, UsedCount, ExpiryDate, IsActive, CreatedAt)
VALUES
('VERDE10',   '10% off first order',       'Percentage', 10, 200, 100, 500, 0, DATEADD(YEAR,1,GETUTCDATE()), 1, GETUTCDATE()),
('FRESH50',   'Flat ₹50 off on ₹500+',    'Fixed',      50, 500, 50,  200, 0, DATEADD(MONTH,6,GETUTCDATE()),1, GETUTCDATE()),
('ORGANIC15', '15% off organic products',  'Percentage', 15, 300, 150, 100, 0, DATEADD(MONTH,3,GETUTCDATE()),1, GETUTCDATE());

-- Sample address for customer
INSERT INTO Addresses (UserId, Label, FullName, Phone, Street, City, State, PinCode, IsDefault, CreatedAt)
SELECT Id, 'Home', Name, Phone, '42, Green Valley Road', 'New Delhi', 'Delhi', '110027', 1, GETUTCDATE()
FROM Users WHERE Role = 'user';

PRINT 'Seed data inserted successfully!';
GO
