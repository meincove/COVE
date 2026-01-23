# Brand Onboarding: Quick Reference

## 📄 Main Document
Full architecture details: [`brand_onboarding_architecture.md`](./brand_onboarding_architecture.md)

---

## ✅ Approved Technical Decisions

### 1. Image Storage
- **Affiliate brands**: Link to external URLs (cost-effective)
- **Direct brands**: Rehost on COVE CDN (reliable, fast)

### 2. Data Validation
- **Required fields**: name, description, price, 1+ image, 1+ size
- **Optional fields**: Auto-filled by AI if missing
- **Strategy**: Lenient onboarding, maintain quality via AI

### 3. Affiliate Updates
- **Prices**: Auto-update immediately
- **Out of stock**: Mark as "unavailable", hide after 30 days
- **Deletions**: Mark as "discontinued", remove from catalog

### 4. Approval Process
- **Auto-approve**: API integrations, valid businesses
- **Manual review**: First-time sellers with <3 products, flagged content
- **SLA**: 24 hours standard, 4 hours priority

### 5. Field Mapping
- **Default**: Smart auto-mapping for common formats
- **Advanced**: Custom drag-and-drop mapper for power users

---

## 🚀 Implementation Priority

### Phase 1: Foundation (Weeks 1-2) ⭐ START HERE
1. Update `Brand` model with new fields
2. Create database migrations
3. Build parser base classes
4. Set up CDN infrastructure

### Phase 2: Manual Onboarding (Weeks 3-4) ⭐ PRIORITY
1. Registration wizard (4 steps)
2. Manual product entry form
3. CSV upload with validation
4. Brand dashboard
5. Admin approval system

### Phase 3: API Integrations (Weeks 5-7)
- Shopify integration
- WooCommerce integration
- Custom API adapter

### Phase 4: Affiliate Feeds (Weeks 8-10)
- Awin, ShareASale, CJ parsers
- AI enrichment
- Daily auto-sync

### Phase 5: Launch (Weeks 11-12)
- Testing, optimization, docs
- Onboard first 10 pilot brands

---

## 📊 Key Metrics to Track
- Onboarding completion rate: >80%
- Time to first product: <15 minutes
- CSV success rate: >90%
- API sync reliability: 99.5%
- Manual review time: <24 hours

---

## 📁 File Structure

```
docs/partner-onboarding/
├── brand_onboarding_architecture.md    # Full architecture doc
└── README.md                            # This file
```

---

**Status**: ✅ Architecture Approved - Ready for Phase 1 Implementation

**Next Action**: Begin database schema enhancement (`Brand` model update)
