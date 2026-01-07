# Brand Partnership Integration Architecture

**Context**: COVE as multi-brand marketplace with 15 brands  
**Vision**: Brands can list products and partner with us  
**Models**: Direct Partnership vs Affiliate

---

## 🏢 Two Partnership Models

### **Model 1: Direct Partnership** (B2B Marketplace)
Brand sells through COVE, we fulfill/handle transactions

### **Model 2: Affiliate Model** (Marketing/Referral)
Brand keeps inventory/fulfillment, we refer customers

---

## 📊 Comparison Matrix

| Aspect | Direct Partnership | Affiliate Model |
|--------|-------------------|-----------------|
| **Inventory** | COVE holds/syncs | Brand holds |
| **Fulfillment** | COVE ships | Brand ships |
| **Payments** | COVE processes | Brand processes |
| **Customer Data** | COVE owns | Shared/Brand owns |
| **Revenue Model** | Commission (20-30%) | Referral fee (5-15%) |
| **Integration Complexity** | High | Low-Medium |
| **Control** | High | Low |
| **Brand Risk** | Low | Medium |

---

## 🔧 Model 1: Direct Partnership Integration

### **Technical Architecture**

```
Brand System → API Integration → COVE Platform
    ↓              ↓                 ↓
 Inventory    Product Sync      COVE Database
 PriceAPI     Order Webhook     AI/Search
```

### **Integration Components**

#### **1. Brand API Connection**
```python
# backend/brands/integrations/brand_connector.py

class BrandAPIConnector:
    """
    Connects to brand's API for product/inventory sync
    """
    
    def __init__(self, brand_id, api_config):
        self.brand_id = brand_id
        self.api_url = api_config['url']
        self.api_key = api_config['key']
    
    def sync_products(self):
        """Fetch products from brand API"""
        response = requests.get(
            f"{self.api_url}/products",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        products = response.json()
        
        # Transform to COVE schema
        for product in products:
            self._import_product(product)
    
    def sync_inventory(self):
        """Update stock levels"""
        # Poll brand API for stock updates
        # Update COVE database
    
    def forward_order(self, order):
        """Send order to brand for fulfillment"""
        requests.post(
            f"{self.api_url}/orders",
            json={
                "order_id": order.id,
                "items": order.items,
                "shipping": order.shipping_address
            }
        )
```

#### **2. Product Sync System**
```python
# backend/brands/models.py

class BrandPartnership(models.Model):
    brand_id = models.CharField(max_length=50, unique=True)
    brand_name = models.CharField(max_length=100)
    partnership_type = models.CharField(
        choices=[('direct', 'Direct'), ('affiliate', 'Affiliate')]
    )
    
    # API Integration
    api_url = models.URLField(blank=True)
    api_key = models.CharField(max_length=200, blank=True)
    webhook_secret = models.CharField(max_length=200, blank=True)
    
    # Business Terms
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    fulfillment_sla_hours = models.IntegerField(default=48)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True)


class BrandProduct(models.Model):
    """Products from partner brands"""
    brand = models.ForeignKey(BrandPartnership, on_delete=models.CASCADE)
    external_id = models.CharField(max_length=100)  # Brand's product ID
    cove_product = models.ForeignKey(ProductMasterGroup, on_delete=models.CASCADE)
    
    # Sync tracking
    last_synced = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(max_length=20)
```

#### **3. Real-Time Inventory Sync**
```python
# backend/brands/tasks.py (Celery Background Job)

@celery_app.task
def sync_brand_inventory(brand_id):
    """
    Scheduled job: Sync inventory every 15 minutes
    """
    brand = BrandPartnership.objects.get(brand_id=brand_id)
    connector = BrandAPIConnector(brand.brand_id, {
        'url': brand.api_url,
        'key': brand.api_key
    })
    
    # Update stock levels
    connector.sync_inventory()
    
    brand.last_sync = timezone.now()
    brand.save()


# Schedule
from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    'sync-all-brands': {
        'task': 'brands.tasks.sync_brand_inventory',
        'schedule': crontab(minute='*/15'),  # Every 15 min
    },
}
```

#### **4. Order Routing**
```python
# backend/orders/routing.py

class OrderRouter:
    """Routes orders to correct brand for fulfillment"""
    
    def process_order(self, order):
        # Group items by brand
        items_by_brand = {}
        for item in order.items.all():
            brand_id = item.product.brand_id
            if brand_id not in items_by_brand:
                items_by_brand[brand_id] = []
            items_by_brand[brand_id].append(item)
        
        # Create sub-orders per brand
        for brand_id, items in items_by_brand.items():
            brand = BrandPartnership.objects.get(brand_id=brand_id)
            
            if brand.partnership_type == 'direct':
                # Send to brand fulfillment API
                self._forward_to_brand(brand, items, order)
            else:
                # Affiliate: just track conversion
                self._track_affiliate_conversion(brand, items, order)
```

#### **5. Revenue Split**
```python
# backend/finance/revenue.py

class RevenueManager:
    """Handles commission and payouts"""
    
    def calculate_commission(self, order):
        """Calculate COVE's commission per brand"""
        commissions = {}
        
        for item in order.items.all():
            brand = item.product.brand_partnership
            commission_rate = brand.commission_rate / 100
            
            item_revenue = item.price * item.quantity
            cove_commission = item_revenue * commission_rate
            brand_payout = item_revenue - cove_commission
            
            if brand.brand_id not in commissions:
                commissions[brand.brand_id] = {
                    'cove': 0,
                    'brand': 0
                }
            
            commissions[brand.brand_id]['cove'] += cove_commission
            commissions[brand.brand_id]['brand'] += brand_payout
        
        return commissions
    
    def generate_payout_report(self, brand_id, month):
        """Monthly payout report for brand"""
        # Query all orders for brand in month
        # Calculate total brand payout
        # Generate invoice
```

---

## 🔗 Model 2: Affiliate Integration

### **Technical Architecture**

```
Customer → COVE → Affiliate Link → Brand Website
                       ↓
                  Track Conversion
                  Calculate Referral Fee
```

### **Integration Components**

#### **1. Affiliate Link Generation**
```python
# backend/brands/affiliate.py

class AffiliateManager:
    """Manages affiliate tracking"""
    
    def generate_affiliate_link(self, product, user):
        """
        Create trackable affiliate link
        """
        # Create unique tracking token
        tracking_token = self._create_token(product, user)
        
        # Store tracking
        AffiliateClick.objects.create(
            brand=product.brand,
            product=product,
            user=user,
            token=tracking_token,
            timestamp=timezone.now()
        )
        
        # Return affiliate URL
        brand_url = product.brand.affiliate_url
        return f"{brand_url}?ref=cove&token={tracking_token}"
    
    def _create_token(self, product, user):
        """Generate unique tracking token"""
        import hashlib
        data = f"{product.id}-{user.id}-{timezone.now()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
```

#### **2. Conversion Tracking**
```python
# backend/brands/webhooks.py

@csrf_exempt
def affiliate_conversion_webhook(request, brand_id):
    """
    Webhook from brand to report conversions
    
    Brand sends:
    {
        "token": "abc123...",
        "order_id": "BRAND-12345",
        "order_total": 150.00,
        "commission": 15.00
    }
    """
    data = json.loads(request.body)
    token = data['token']
    
    # Find click
    click = AffiliateClick.objects.get(token=token)
    
    # Record conversion
    AffiliateConversion.objects.create(
        click=click,
        brand_order_id=data['order_id'],
        order_total=data['order_total'],
        commission=data['commission'],
        status='pending'
    )
    
    return JsonResponse({'status': 'recorded'})
```

#### **3. Product Display (Affiliate)**
```python
# frontend/components/ProductCard.jsx

function ProductCard({ product }) {
  const isAffiliate = product.brand.partnership_type === 'affiliate';
  
  const handleClick = async () => {
    if (isAffiliate) {
      // Track click
      const response = await fetch('/api/affiliate/click', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id })
      });
      
      const { affiliate_url } = await response.json();
      
      // Redirect to brand site
      window.open(affiliate_url, '_blank');
    } else {
      // Normal flow: add to COVE cart
      addToCart(product);
    }
  };
  
  return (
    <div className="product-card">
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>€{product.price}</p>
      
      {isAffiliate ? (
        <button onClick={handleClick}>
          View on {product.brand.name}  
          <ExternalLinkIcon />
        </button>
      ) : (
        <button onClick={handleClick}>
          Add to Cart
        </button>
      )}
    </div>
  );
}
```

---

## 🚀 Brand Onboarding Flow

### **Direct Partnership Onboarding**

```
1. Brand applies via merchant portal
2. COVE reviews brand fit
3. Contract signed (commission rate, SLA)
4. Technical integration:
   a. Brand provides API credentials
   b. COVE tests connection
   c. Initial product sync
   d. Inventory sync setup
5. Go live → products appear in COVE
6. Orders start flowing
```

### **Affiliate Onboarding**

```
1. Brand signs up for affiliate program
2. Provide:
   - Brand website URL
   - Product feed URL (optional)
   - Conversion webhook (optional)
3. COVE generates affiliate links
4. Products listed with "Shop at Brand" button
5. Clicks tracked → Conversions reported
```

---

## 💼 Brand Dashboard

Both models need a **Brand Portal**:

```
/merchant/dashboard/
├── Overview
│   ├── Sales this month
│   ├── Pending payouts
│   └── Top products
├── Products
│   ├── Import/Sync
│   ├── Edit listings
│   └── Inventory management
├── Orders
│   ├── New orders (direct only)
│   ├── Fulfillment status
│   └── Returns
├── Analytics
│   ├── Traffic from COVE
│   ├── Conversion rate
│   └── Customer insights
└── Payouts
    ├── Revenue breakdown
    ├── Commission details
    └── Payment history
```

---

## 🔐 API Specifications

### **Brand API (what brands must implement)**

For **direct partnerships**, brands need:

```yaml
# GET /api/products
Response:
  - id: "BRAND-PROD-001"
    name: "Black Hoodie"
    price: 89.99
    stock: 45
    images: [...]
    
# POST /api/orders
Request:
  order_id: "COVE-12345"
  items: [...]
  shipping: {...}
Response:
  fulfillment_id: "BRAND-FUL-789"
  estimated_delivery: "2024-12-15"
```

### **COVE Webhooks (what we provide)**

For **affiliate**, we notify brands:

```yaml
# POST brand.com/webhooks/cove-click
Request:
  token: "abc123"
  product_id: "BRAND-PROD-001"
  user_id: "cove-user-456"
  timestamp: "2024-12-09T18:00:00Z"
```

---

## 📊 Revenue Models

### **Direct Partnership**
```
Product Price: €100
COVE Commission: €25 (25%)
Brand Payout: €75
COVE keeps commission, handles customer
```

### **Affiliate**
```
Product Price: €100 (on brand's site)
Referral Fee: €10 (10% of sale)
Brand Payout: €90
Brand handles customer, COVE gets referral fee
```

---

## 🎯 Which Model for COVE?

### **Recommendation: Hybrid Approach**

**Start with Affiliate** (faster, lower risk):
- List products from 15 brands
- Drive traffic via AI recommendations
- Track conversions
- Prove value to brands

**Grow to Direct** (higher revenue):
- Once proven, convert top brands  
- Better margins (25% vs 10%)
- More control over experience
- Unified checkout

---

## 🛠️ Implementation Priority

### **Phase 1: Affiliate Foundation** (Week 1-2)
- [ ] Brand partnership model
- [ ] Affiliate link generator
- [ ] Click tracking
- [ ] Product display with external

 links

### **Phase 2: Direct Partnership** (Week 3-6)
- [ ] API connector framework
- [ ] Inventory sync jobs
- [ ] Order routing
- [ ] Revenue split calculator
- [ ] Brand portal MVP

### **Phase 3: Scale** (Week 7+)
- [ ] Automated onboarding
- [ ] Advanced analytics
- [ ] Multi-brand checkout optimization
- [ ] Payout automation

---

**Answer to your question**: Both are very possible! 

**Affiliate** = Easy integration, lower revenue  
**Direct** = Complex integration, higher revenue

Start affiliate, grow into direct partnerships. Your multi-brand catalog already proves the model works!

Want me to build the affiliate integration once the DB loads?
