# Domain Setup Guide

## 1. Domain Strategy
Since you own both `meincove.com` and `meincove.de`, here is the recommended setup for a professional brand:

*   **Main Site**: `https://meincove.com` (Your Vercel Frontend)
*   **German Local**: `https://meincove.de` (Redirects to .com OR serves German variant)
*   **Backend API**: `https://api.meincove.com` (Hosted on Render)

---

## 2. Configuring `meincove.com` (Frontend)

Your screenshot shows Vercel is waiting for DNS configuration ("Invalid Configuration").

### Action Required in Namecheap
1.  Log in to **Namecheap**.
2.  Go to **Domain List** -> **meincove.com** -> **Manage**.
3.  Go to **Advanced DNS**.
4.  Add the following records (as requested by Vercel):

| Type | Host | Value |
| :--- | :--- | :--- |
| **A Record** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

*Delete any other "A Records" or "Parking pages" to avoid conflicts.*

5.  Go back to **Vercel** -> **Settings** -> **Domains**.
6.  Click **Refresh**. It should turn Green in a few minutes.

---

## 3. Configuring Backend (Render)
Once you deploy the `render.yaml` blueprint:

1.  Render will give you a generic URL like `cove-backend.onrender.com`.
2.  To make it professional:
    *   In Namecheap, add a **CNAME** record:
        *   Host: `api`
        *   Value: `cove-backend.onrender.com`
    *   In Render Dashboard -> Settings -> Custom Domains, add `api.meincove.com`.

This gives you `api.meincove.com` for all your fetch requests!
