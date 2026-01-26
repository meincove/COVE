# Partner Dashboard - Complete Vision & Architecture

## 🎯 Overall Vision

The **Partner Dashboard** is a comprehensive self-service portal that enables brands to onboard, manage products, track orders, and monitor revenue on the COVE platform. The vision is to create an **end-to-end brand management system** that:

1. **Eliminates manual overhead** - Partners can manage everything themselves
2. **Provides full transparency** - Real-time visibility into products, orders, and earnings
3. **Streamlines operations** - From product creation to payment tracking
4. **Scales effortlessly** - Support manual uploads, API integrations, and affiliate feeds

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    COVE PLATFORM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ Public Shopping  │◄────────┤  Partner Dashboard      │  │
│  │    Catalog       │         │  (Management Portal)    │  │
│  └──────────────────┘         └─────────────────────────┘  │
│          ▲                              │                   │
│          │                              │                   │
│          │        ┌────────────────────┴───────────┐       │
│          │        │                                 │       │
│          │        ▼                                 ▼       │
│  ┌───────┴────────────┐            ┌──────────────────────┐│
│  │  Product Database  │            │   Orders & Revenue   ││
│  │  (ProductMaster    │            │     Tracking         ││
│  │   + Variants)      │            │                      ││
│  └────────────────────┘            └──────────────────────┘│
│          ▲                                                  │
│          │                                                  │
│  ┌───────┴────────────────────────────────┐                │
│  │  Brand Table (Primary)                 │                │
│  │  - Brand ID, Name, Type                │                │
│  │  - Contact Info, Status                │                │
│  └────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Complete User Flow

### Phase 1: Onboarding
```
1. Landing Page
   ↓
2. Registration (4-step wizard)
   ├─ Step 1: Brand Info (name, type, contact)
   ├─ Step 2: Business Details (country, description)
   ├─ Step 3: Integration Method (manual, API, affiliate)
   └─ Step 4: Review & Submit
   ↓
3. Welcome Email + Credentials
   ↓
4. Partner Dashboard (Empty State)
```

### Phase 2: Product Management
```
Partner Dashboard
   ↓
Add Products
   ├─ Manual Entry Form
   ├─ Bulk CSV Upload (future)
   └─ API Integration (future)
   ↓
Products Appear in:
   ├─ Partner Products Page
   └─ Public Shopping Catalog
   ↓
Product Actions:
   ├─ View/Edit Product Details
   ├─ Visit Public Product Page
   └─ Locate in Shopping Catalog
```

### Phase 3: Order & Revenue Tracking
```
Customer Places Order
   ↓
Order Appears in Partner Dashboard
   ├─ Partner Orders Page
   │  ├─ View order details
   │  ├─ Update fulfillment status
   │  └─ See commission breakdown
   └─ Partner Revenue Page
      ├─ Track gross vs net revenue
      ├─ View commission (19%)
      └─ Monitor payouts
```

---

## 🏗️ Dashboard Pages Structure

### 1. Main Dashboard (`/partner-onboarding/dashboard`)
**Purpose**: Overview and quick access hub

**Components**:
- Welcome header with brand name
- Onboarding status badge
- **Quick Stats Cards** (clickable):
  - 📦 Total Products → Partner Products page
  - 🛒 Orders → Partner Orders page
  - 💰 Revenue → Partner Revenue page
  - ✨ AI Score (future)
- **Action Center**:
  - "Add Product Manually" button
  - "Bulk Upload CSV" button (coming soon)
- **Brand Information Panel**:
  - Brand name, type, country
  - Contact email, description
  - Brand ID (for API integration)
- **Integration Settings Panel**:
  - Integration method (manual/API/affiliate)
  - Member since date
  - AI features preview

---

### 2. Partner Products Page (`/partner-onboarding/dashboard/partner-products`)
**Purpose**: Manage all products with full CRUD operations

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header: "Your Products"            [+ Add Product]  │
├─────────────────────────────────────────────────────┤
│ Stats: [Total] [Colors] [Active] [Out of Stock]    │
├─────────────────────────────────────────────────────┤
│ Search + Filter Bar                                 │
├─────────────────────────────────────────────────────┤
│ Product Grid (3 columns):                          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Product  │  │ Product  │  │ Product  │         │
│  │  Card    │  │  Card    │  │  Card    │         │
│  │          │  │          │  │          │         │
│  │ [Edit]   │  │ [Edit]   │  │ [Edit]   │         │
│  │ [👁][📍] │  │ [👁][📍] │  │ [👁][📍] │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

**Product Card Features**:
- Product image (placeholder for now)
- Name, type, gender
- Color count, active status
- **Action Buttons**:
  - 🔧 **Edit** - Opens inline edit modal
  - 👁️ **Visit Product Page** - Opens `/product/{slug}`
  - 📍 **Locate in Catalog** - Navigates to `/shopping?category={type}&highlight={slug}`

**Inline Edit Modal** (45-Second Undo Window):
```
┌─────────────────────────────────────────┐
│ Edit Product: [Product Name]           │
├─────────────────────────────────────────┤
│ [Product Name] [Description]            │
│ [Type] [Gender] [Material]              │
│                                         │
│ Colors & Sizes:                         │
│  ┌─ Black ────────────────────────┐    │
│  │ S: 10, M: 15, L: 20, XL: 5     │    │
│  │ [+ Add Size]                    │    │
│  └────────────────────────────────┘    │
│  [+ Add Color]                          │
│                                         │
│ Images: [Upload]                        │
│                                         │
│        [Apply Changes]                  │
└─────────────────────────────────────────┘
     ↓ (After clicking "Apply Changes")
┌─────────────────────────────────────────┐
│ ✅ Changes Applied!                     │
│    Added size XXL to Black variant      │
│                                         │
│        [Undo (45s)]                     │
│                                         │
│ ⚠️ Form locked during undo window       │
└─────────────────────────────────────────┘
     ↓ (45 seconds later)
     Changes finalized ✓
     Modal closes automatically
```

---

### 3. Partner Orders Page (`/partner-onboarding/dashboard/partner-orders`)
**Purpose**: View and manage orders containing partner's products

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header: "Your Orders"                               │
├─────────────────────────────────────────────────────┤
│ Revenue Summary Cards:                              │
│ [Gross Revenue] [Commission 19%] [Net Revenue 81%] │
├─────────────────────────────────────────────────────┤
│ Date Range Filter: [Last 30 Days ▼]                │
├─────────────────────────────────────────────────────┤
│ Orders List:                                        │
│                                                     │
│  Order #12345  |  €100.00  |  🟢 Paid             │
│  T-Shirt×2                 |  [Processing ▼]       │
│  Gross: €100 | Commission: -€19 | Net: €81         │
│  [Tracking: Add Number]                            │
│  ───────────────────────────────────────────────   │
│                                                     │
│  Order #12344  |  €75.00   |  🟡 Pending           │
│  Hoodie×1                  |  [Shipped ▼]           │
│  Gross: €75 | Commission: -€14.25 | Net: €60.75    │
│  Tracking: DHL-12345678                            │
└─────────────────────────────────────────────────────┘
```

**Order Status Flow**:
```
Payment Status (Read-Only):
├─ 🟢 Successful (counts toward revenue)
├─ 🟡 Pending
└─ 🔴 Failed

Fulfillment Status (Partner Editable):
┌─ ⏳ Processing
├─ 📦 Shipped
└─ ✅ Delivered
```

**Features**:
- Payment status badge (non-editable)
- Fulfillment status dropdown (editable)
- Commission breakdown per order
- Optional tracking number field
- Order history with timestamps

---

### 4. Partner Revenue Page (`/partner-onboarding/dashboard/partner-revenue`)
**Purpose**: Track earnings and payout information

**Revenue Model**: 19% to COVE | 81% to Partner

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header: "Revenue Dashboard"                         │
├─────────────────────────────────────────────────────┤
│ Overview Cards:                                     │
│ [Total Net (81%)] [Gross] [Commission Paid]        │
│ [This Month Net] [This Week Net]                   │
├─────────────────────────────────────────────────────┤
│ Charts:                                             │
│  Line Chart: Revenue Over Time (30 days)           │
│  Bar Chart: Revenue by Product Type                │
│  Pie Chart: Top Selling Products                   │
├─────────────────────────────────────────────────────┤
│ Product Breakdown Table:                           │
│ Product        | Gross  | Commission | Net         │
│ ──────────────────────────────────────────────────  │
│ T-Shirt Basic  | €500   | -€95       | €405        │
│ Hoodie Classic | €300   | -€57       | €243        │
│ Total          | €800   | -€152      | €648        │
├─────────────────────────────────────────────────────┤
│ Payout Information:                                 │
│ Pending Payout: €648                                │
│ Next Payout: Feb 1, 2026                           │
│ Bank Account: ••••1234                              │
│                          [Export CSV] [Export PDF]  │
└─────────────────────────────────────────────────────┘
```

**Revenue Calculations**:
```javascript
const COVE_COMMISSION = 0.19  // 19%

For each successful order:
Gross Amount: €100.00
Commission:   €19.00  (19% of gross)
Net Amount:   €81.00  (81% to partner)
```

---

## 🔄 Data Flow Architecture

### Database Schema (Simplified)

```sql
-- Primary Table
Brand
├─ brand_id (PK)
├─ brand_name
├─ brand_type (direct/affiliate)
├─ contact_email
├─ onboarding_status
└─ integration_method

-- Child Table 1 (Products)
ProductMasterGroup
├─ product_id (PK)
├─ brand_id (FK → Brand)
├─ slug
├─ name
├─ type
├─ gender
└─ description

-- Child Table 2 (Variants)
ColorGroup
├─ variant_id (PK)
├─ product_id (FK → ProductMasterGroup)
├─ color_name
└─ hex

-- Child Table 3 (Sizes/Stock)
SizeStockPrice
├─ variant_id (FK → ColorGroup)
├─ size
├─ quantity
└─ price

-- Child Table 4 (Orders) [Future]
Order
├─ order_id (PK)
├─ brand_id (FK → Brand)
├─ payment_status
├─ fulfillment_status
└─ tracking_number
```

### API Endpoints

```
Authentication:
POST /api/brands/register/    # Brand registration

Brand Management:
GET  /api/brands/{id}/         # Get brand details
PUT  /api/brands/{id}/         # Update brand info

Product Management:
GET  /api/brands/{id}/products/          # List all products
POST /api/brands/{id}/products/          # Create product
GET  /api/brands/{id}/products/{pid}/    # Get product details
PUT  /api/brands/{id}/products/{pid}/    # Update product
DELETE /api/brands/{id}/products/{pid}/  # Delete product

Order Management: [Future]
GET  /api/brands/{id}/orders/            # List orders
PATCH /api/brands/{id}/orders/{oid}/     # Update order status

Revenue Tracking: [Future]
GET  /api/brands/{id}/revenue/           # Revenue data
GET  /api/brands/{id}/revenue/stats/     # Revenue metrics
```

---

## 🎨 Design System

### Color Palette
```
Primary Actions:    Blue (#3B82F6)
Success/Active:     Green (#10B981)
Orders:             Emerald (#10B981)
Revenue:            Purple (#9333EA)
AI Features:        Orange (#FB923C)
Warnings:           Yellow (#F59E0B)
Errors:             Red (#EF4444)
```

### Component Hierarchy
```
1. Navigation
   ├─ Top Header (COVE branding + settings)
   └─ Back Button (to main dashboard)

2. Content Sections
   ├─ Page Header (title + primary action)
   ├─ Stats Cards (clickable metrics)
   ├─ Filters & Search
   └─ Main Content Grid/List

3. Cards
   ├─ Stat Cards (metrics overview)
   ├─ Product Cards (grid items)
   ├─ Order Cards (list items)
   └─ Info Panels (brand details)

4. Forms & Modals
   ├─ Product Entry Form
   ├─ Inline Edit Modal
   └─ Status Dropdowns
```

---

## 🚀 Future Enhancements

### Short-term (Next Sprint)
1. ✅ Inline edit modal with undo window
2. CSV bulk upload
3. Product images upload
4. Order notifications

### Medium-term (Next Month)
1. API integrations (Shopify, WooCommerce)
2. Real revenue tracking with Stripe
3. Automated payout system
4. Analytics dashboard

### Long-term (Vision)
1. Affiliate feed parsers (Awin, ShareASale, CJ)
2. AI product enrichment
3. Automated product tagging
4. Smart pricing recommendations
5. Multi-user RBAC (brand teams)

---

## 📈 Success Metrics

**For Partners**:
- Time to first product: < 5 minutes
- Product edit speed: < 2 minutes
- Revenue visibility: Real-time
- Order management: Self-service

**For COVE**:
- Partner onboarding rate: +50%
- Manual support tickets: -70%
- Product catalog growth: +100%/month
- Partner satisfaction: >4.5/5

---

## 🎯 Key Principles

1. **Self-Service First** - Partners should never need to contact support for routine tasks
2. **Immediate Feedback** - All actions show instant results with undo options
3. **Full Transparency** - Every fee, commission, and status is clearly visible
4. **Scalability** - System handles 1 partner or 10,000 partners seamlessly
5. **Data Integrity** - Changes sync immediately across all pages (dashboard, shopping, products)

---

This vision document serves as the north star for all partner dashboard development. Every feature should align with these principles and contribute to the overall goal: **making brand management effortless on COVE**.
