# Cove 1.0 Production Sheet
**Date:** January 22, 2026
**Status:** PROMOTED TO PRODUCTION (Live)

---

## 1. Visual Refinements & User Experience
Complete overhaul of visual assets to match "Premium" aesthetic.

### **Typography**
*   **Font Update**: Changed primary font to **`Atop`** (via `next/local/font`).
*   **Styling**: Applied globally to Headings and Brand elements.

### **3D Animations (Three.js/Fiber)**
*   **Particle Wave**:
    *   **Speed**: Increased animation speed (`0.2` -> `0.4`) for more dynamism.
    *   **Connections**: Enabled visible lines/links between particles for a "network" effect.
*   **Interactive Owl (Auth Modal)**:
    *   **Model**: Refined to use **Head-Only** geometry (removed full body clipping).
    *   **Behavior**: Implemented realistic 3D head tracking following the cursor.
    *   **Constraints**: Limited rotation to **8 degrees** to prevent unnatural twisting.

### **UI Components**
*   **Auth Modal**:
    *   **Scaling**: Implemented dynamic JavaScript height calculation to ensure exactly **90vh** on all viewports (mobile/desktop).
    *   **Layout**: Adjusted flexbox centering to perfect alignment.

---

## 2. Security & Infrastructure Updates
Critical updates to resolve vulnerabilities and unblock Vercel deployments.

### **Security Fix (CVE-2025-66478)**
*   **Issue**: Critical vulnerability detected in Next.js `15.3.2`.
*   **Action**: Upgraded `next` package to **`16.1.4`** (Latest Stable).
*   **Result**: Cleared Vercel Security Block.

### **Build Configuration**
*   **Webpack Force**:
    *   Next.js 16 defaults to Turbopack, which broke custom GLSL shaders (`raw-loader`, `glslify`).
    *   **Fix**: Modified `package.json` scripts to force Webpack usage:
        ```json
        "build": "next build --webpack"
        ```

### **Dependency Resolution**
*   **Peer Dependency Conflict**:
    *   `@clerk/nextjs` collided with the new Next.js 16 version.
    *   **Fix**: Created `.npmrc` file in root:
        ```ini
        legacy-peer-deps=true
        ```
    *   **Result**: Vercel build process successfully bypassed strict peer dependency checks.

---

## 3. Deployment Pipeline
Restored Continuous Deployment (CD) flow.

*   **Branch Fixes**:
    *   Synced `develop` -> `main` to ensure Production has the latest security patches.
    *   Verified git history to confirm `ecc97a3` (Merge commit) is live.
*   **Vercel Settings**:
    *   Environment: **Production**
    *   Branch: **`main`**
    *   Status: **Ready (Green)**
    *   Live URL: `cove-iota.vercel.app`

---

**Signed off by:** Antigravity (AI Assistant)
