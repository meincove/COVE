# Partner Page Flow Set - 1

**Date:** 2026-01-24
**Status:** In Progress / Verifying

---

## 1. Work Completed
We have resolved critical configuration and data inconsistencies preventing the partner onboarding flow from working correctly.

### **Core Configuration Fixes**
- **Next.js Build System**: Resolved a conflict between `Turbopack` (default in Next.js 16) and your custom `webpack` config (required for GLSL shaders). Forced `next dev --webpack`.
- **Frontend-Backend Connection**: Fixed the "Failed to fetch" error. The frontend was pointing to a production Railway URL (`cove-production...`). Updated `.env.local` to point to `http://localhost:8000`.
- **Port Management**: Verified port usage to avoid conflicts between Django Backend (`8000`) and Cove AI Core (`8000/8080`).

### **Data & Logic Fixes**
- **Product Pricing Bug**: Fixed an issue where all new products were created with a price of **€0.00**. The backend serializer was ignoring input prices. It now automatically calculates the `base_price` from the minimum price of the created sizes.
- **Image Persistence**: Verified and ensured product images are correctly mapped from the frontend (`image_url`) to the backend model (`image_name`).
- **URL Consistency**: Fixed the mismatch where Dashboard links went to generic product pages (`/product/slug`) while the store expects variant-specific URLs (`/product/slug?variantId=...`).
- **Product Visibility**: Added missing categories (Dress, Shoes, Accessories) to the Shopping Page filters so they appear in the grid.

### **New Features**
- **Soft Delete / Bin**: Implemented `status='trashed'` logic. Deleting acts as "Move to Trash". Added a Recycle Bin page (`/dashboard/bin`) to restore or permanently delete items.
- **Navigation Shortcuts**: Added cross-linking buttons between the Partner Dashboard and Shopping Storefront.

---

## 2. New & Modified Files

### **Modified Files**
| File Path | Change Description |
| :--- | :--- |
| `frontend/package.json` | Updated `dev` script to `next dev --webpack` to fix build errors. |
| `frontend/.env.local` | Changed API URLs to `http://localhost:8000`. |
| `backend/catalog/models.py` | Added `status` and `trashed_at` fields to `ProductMasterGroup`. |
| `backend/catalog/serializers_product.py` | Updated logic for price calculation and smart variant linking. |
| `backend/catalog/views_product.py` | Implemented soft delete `delete()` method and `status` filtering. |
| `frontend/.../partner-products/page.tsx` | Added "Recycle Bin" link. |
| `frontend/src/components/shopping/ShoppingPageClient.tsx` | Added missing `TYPE_SECTIONS`. |

### **New Files**
| File Path | Purpose |
| :--- | :--- |
| `frontend/.../dashboard/bin/page.tsx` | New Recycle Bin UI page. |
| `backend/catalog/migrations/0009...` | Database migration for soft delete support. |

---

## 3. Architectural Connections & Schema
The system follows a standard **Next.js Frontend + Django REST Framework Backend** architecture.

### **Data Flow: Product Lifecycle**
1.  **Creation**: `POST /api/brands/{id}/products/` -> Creates Active product.
2.  **Listing**: `GET /api/brands/{id}/products/?status=active` -> Shows only non-deleted items.
3.  **Deletion**: `DELETE /api/brands/{id}/products/{id}/` -> Updates `status='trashed'`.
4.  **Bin View**: `GET /api/brands/{id}/products/?status=trashed` -> Shows deleted items.
5.  **Restoration**: `POST .../restore/` -> Reverts to `status='active'`.
6.  **Hard Delete**: `DELETE .../permanent/` -> Removes from DB.

---

## 4. Pending Tasks
1.  **Timer Logic**: Currently, the "Bin" keeps items indefinitely. A background cron job (Celery/Redis) is needed to auto-delete items older than 30 days (or 60s as requested).
2.  **Brand Page Verification**: Check if the public Brand Page (`/brands/{slug}`) correctly hides trashed products.
