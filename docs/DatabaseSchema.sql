-- ============================================================
-- VerdeCrop Database Schema — SQL Server 2022
-- ============================================================
CREATE DATABASE VerdeCropDB;
GO
USE VerdeCropDB;
GO

-- Users
CREATE TABLE Users (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    Name              NVARCHAR(200)    NOT NULL,
    Email             NVARCHAR(200)    NULL,
    Phone             NVARCHAR(20)     NULL,
    PasswordHash      NVARCHAR(500)    NULL,
    Role              NVARCHAR(20)     NOT NULL DEFAULT 'user',
    AvatarUrl         NVARCHAR(500)    NULL,
    IsActive          BIT              NOT NULL DEFAULT 1,
    IsDeleted         BIT              NOT NULL DEFAULT 0,
    IsEmailVerified   BIT              NOT NULL DEFAULT 0,
    IsPhoneVerified   BIT              NOT NULL DEFAULT 0,
    FcmToken          NVARCHAR(500)    NULL,
    CreatedAt         DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt         DATETIME2        NULL,
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT UQ_Users_Phone UNIQUE (Phone)
);

-- Refresh Tokens
CREATE TABLE RefreshTokens (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    UserId           INT           NOT NULL REFERENCES Users(Id),
    Token            NVARCHAR(500) NOT NULL,
    ExpiresAt        DATETIME2     NOT NULL,
    IsRevoked        BIT           NOT NULL DEFAULT 0,
    ReplacedByToken  NVARCHAR(500) NULL,
    CreatedAt        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt        DATETIME2     NULL
);

-- OTP Codes
CREATE TABLE OtpCodes (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Identifier   NVARCHAR(200) NOT NULL,
    Code         NVARCHAR(10)  NOT NULL,
    Purpose      NVARCHAR(50)  NOT NULL DEFAULT 'login',
    ExpiresAt    DATETIME2     NOT NULL,
    IsUsed       BIT           NOT NULL DEFAULT 0,
    AttemptCount INT           NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2     NULL
);
CREATE INDEX IX_OtpCodes_Identifier ON OtpCodes(Identifier, Purpose, IsUsed);

-- Categories
CREATE TABLE Categories (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(100) NOT NULL,
    Slug         NVARCHAR(100) NOT NULL,
    Description  NVARCHAR(500) NULL,
    IconUrl      NVARCHAR(500) NULL,
    DisplayOrder INT           NOT NULL DEFAULT 0,
    IsActive     BIT           NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2     NULL,
    CONSTRAINT UQ_Categories_Slug UNIQUE (Slug)
);
INSERT INTO Categories (Name, Slug, IconUrl, DisplayOrder) VALUES
('Vegetables','vegetables','🥦',1),('Fruits','fruits','🍎',2),
('Grains & Pulses','grains-pulses','🌾',3),('Dairy','dairy','🥛',4),
('Herbs & Spices','herbs-spices','🌿',5),('Honey & Jam','honey-jam','🍯',6);

-- Farmer Profiles
CREATE TABLE FarmerProfiles (
    Id                   INT IDENTITY(1,1) PRIMARY KEY,
    UserId               INT              NOT NULL REFERENCES Users(Id),
    FarmName             NVARCHAR(200)    NOT NULL,
    Description          NVARCHAR(2000)   NULL,
    Location             NVARCHAR(200)    NOT NULL,
    State                NVARCHAR(100)    NOT NULL,
    PinCode              NVARCHAR(10)     NOT NULL,
    CertificationNumber  NVARCHAR(100)    NULL,
    BankAccountNumber    NVARCHAR(50)     NULL,
    BankIfsc             NVARCHAR(20)     NULL,
    IsApproved           BIT              NOT NULL DEFAULT 0,
    TotalSales           DECIMAL(18,2)    NOT NULL DEFAULT 0,
    Rating               DECIMAL(3,2)     NOT NULL DEFAULT 0,
    ReviewCount          INT              NOT NULL DEFAULT 0,
    CreatedAt            DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt            DATETIME2        NULL
);

-- Products
CREATE TABLE Products (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(300)  NOT NULL,
    Slug          NVARCHAR(300)  NOT NULL,
    Description   NVARCHAR(3000) NULL,
    CategoryId    INT            NOT NULL REFERENCES Categories(Id),
    FarmerId      INT            NOT NULL REFERENCES FarmerProfiles(Id),
    Price         DECIMAL(10,2)  NOT NULL,
    OriginalPrice DECIMAL(10,2)  NULL,
    Unit          NVARCHAR(50)   NOT NULL DEFAULT 'kg',
    MinOrderQty   DECIMAL(8,3)   NOT NULL DEFAULT 1,
    StockQuantity INT            NOT NULL DEFAULT 0,
    ImageUrl      NVARCHAR(500)  NULL,
    ImageUrls     NVARCHAR(MAX)  NULL,
    IsOrganic     BIT            NOT NULL DEFAULT 1,
    IsFeatured    BIT            NOT NULL DEFAULT 0,
    IsActive      BIT            NOT NULL DEFAULT 1,
    Rating        DECIMAL(3,2)   NOT NULL DEFAULT 0,
    ReviewCount   INT            NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2      NULL,
    CONSTRAINT UQ_Products_Slug UNIQUE (Slug)
);
CREATE INDEX IX_Products_CategoryId  ON Products(CategoryId, IsActive);
CREATE INDEX IX_Products_FarmerId    ON Products(FarmerId, IsActive);
CREATE INDEX IX_Products_IsFeatured  ON Products(IsFeatured, IsActive);

-- Addresses
CREATE TABLE Addresses (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT            NOT NULL REFERENCES Users(Id),
    Label     NVARCHAR(50)   NOT NULL DEFAULT 'Home',
    FullName  NVARCHAR(200)  NOT NULL,
    Phone     NVARCHAR(20)   NOT NULL,
    Street    NVARCHAR(500)  NOT NULL,
    City      NVARCHAR(100)  NOT NULL,
    State     NVARCHAR(100)  NOT NULL,
    PinCode   NVARCHAR(10)   NOT NULL,
    IsDefault BIT            NOT NULL DEFAULT 0,
    CreatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2      NULL
);

-- Carts
CREATE TABLE Carts (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT       NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL
);
CREATE TABLE CartItems (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    CartId    INT            NOT NULL REFERENCES Carts(Id) ON DELETE CASCADE,
    ProductId INT            NOT NULL REFERENCES Products(Id),
    Quantity  DECIMAL(8,3)   NOT NULL,
    CreatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2      NULL
);

-- Orders
CREATE TABLE Orders (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    OrderNumber       NVARCHAR(30)   NOT NULL,
    UserId            INT            NOT NULL REFERENCES Users(Id),
    AddressId         INT            NOT NULL REFERENCES Addresses(Id),
    Status            NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    PaymentMethod     NVARCHAR(30)   NOT NULL DEFAULT 'razorpay',
    PaymentStatus     NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    Subtotal          DECIMAL(10,2)  NOT NULL,
    DeliveryCharge    DECIMAL(10,2)  NOT NULL DEFAULT 0,
    DiscountAmount    DECIMAL(10,2)  NOT NULL DEFAULT 0,
    TaxAmount         DECIMAL(10,2)  NOT NULL DEFAULT 0,
    TotalAmount       DECIMAL(10,2)  NOT NULL,
    CouponCode        NVARCHAR(50)   NULL,
    Notes             NVARCHAR(500)  NULL,
    EstimatedDelivery DATETIME2      NULL,
    DeliveredAt       DATETIME2      NULL,
    CreatedAt         DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt         DATETIME2      NULL,
    CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber)
);
CREATE INDEX IX_Orders_UserId ON Orders(UserId, CreatedAt DESC);
CREATE INDEX IX_Orders_Status ON Orders(Status);

CREATE TABLE OrderItems (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    OrderId     INT           NOT NULL REFERENCES Orders(Id) ON DELETE CASCADE,
    ProductId   INT           NOT NULL REFERENCES Products(Id),
    ProductName NVARCHAR(300) NOT NULL,
    Quantity    DECIMAL(8,3)  NOT NULL,
    Unit        NVARCHAR(50)  NOT NULL,
    UnitPrice   DECIMAL(10,2) NOT NULL,
    TotalPrice  DECIMAL(10,2) NOT NULL,
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   DATETIME2     NULL
);

CREATE TABLE OrderStatusHistories (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    OrderId         INT           NOT NULL REFERENCES Orders(Id) ON DELETE CASCADE,
    Status          NVARCHAR(30)  NOT NULL,
    Note            NVARCHAR(500) NULL,
    UpdatedByUserId INT           NULL REFERENCES Users(Id),
    CreatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2     NULL
);

-- Payments
CREATE TABLE Payments (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    OrderId             INT            NOT NULL REFERENCES Orders(Id) ON DELETE CASCADE,
    Provider            NVARCHAR(30)   NOT NULL,
    ProviderOrderId     NVARCHAR(200)  NULL,
    ProviderPaymentId   NVARCHAR(200)  NULL,
    ProviderSignature   NVARCHAR(500)  NULL,
    Amount              DECIMAL(10,2)  NOT NULL,
    Currency            NVARCHAR(10)   NOT NULL DEFAULT 'INR',
    Status              NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    FailureReason       NVARCHAR(500)  NULL,
    CreatedAt           DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt           DATETIME2      NULL
);

-- Reviews
CREATE TABLE Reviews (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    ProductId          INT            NOT NULL REFERENCES Products(Id),
    UserId             INT            NOT NULL REFERENCES Users(Id),
    OrderId            INT            NOT NULL REFERENCES Orders(Id),
    Rating             INT            NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment            NVARCHAR(2000) NULL,
    ImageUrls          NVARCHAR(MAX)  NULL,
    IsVerifiedPurchase BIT            NOT NULL DEFAULT 0,
    CreatedAt          DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt          DATETIME2      NULL
);
CREATE UNIQUE INDEX UQ_Reviews_UserProduct ON Reviews(UserId, ProductId);

-- Wishlist
CREATE TABLE WishlistItems (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT       NOT NULL REFERENCES Users(Id),
    ProductId INT       NOT NULL REFERENCES Products(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL
);
CREATE UNIQUE INDEX UQ_Wishlist_UserProduct ON WishlistItems(UserId, ProductId);

-- Coupons
CREATE TABLE Coupons (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    Code               NVARCHAR(50)   NOT NULL,
    Description        NVARCHAR(300)  NULL,
    DiscountType       NVARCHAR(20)   NOT NULL DEFAULT 'Percentage',
    DiscountValue      DECIMAL(10,2)  NOT NULL,
    MinOrderAmount     DECIMAL(10,2)  NOT NULL DEFAULT 0,
    MaxDiscountAmount  DECIMAL(10,2)  NULL,
    UsageLimit         INT            NULL,
    UsedCount          INT            NOT NULL DEFAULT 0,
    ExpiryDate         DATETIME2      NULL,
    IsActive           BIT            NOT NULL DEFAULT 1,
    CreatedAt          DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt          DATETIME2      NULL,
    CONSTRAINT UQ_Coupons_Code UNIQUE (Code)
);

-- Notifications
CREATE TABLE Notifications (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT            NOT NULL REFERENCES Users(Id),
    Title     NVARCHAR(200)  NOT NULL,
    Body      NVARCHAR(1000) NOT NULL,
    Type      NVARCHAR(30)   NOT NULL DEFAULT 'system',
    ActionUrl NVARCHAR(500)  NULL,
    IsRead    BIT            NOT NULL DEFAULT 0,
    CreatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2      NULL
);
CREATE INDEX IX_Notifications_UserId ON Notifications(UserId, IsRead, CreatedAt DESC);

PRINT 'VerdeCropDB schema created successfully!';
GO
