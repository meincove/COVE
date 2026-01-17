# Global Navbar Redesign Strategy

## Overview
We are transitioning from a complex 3-state navbar (Full/Island/Menu) to a **Single "Global Navbar"** architecture. This new component will be a consistent, high-performance floating pill that persists across the Shopping, Product, and Checkout experiences.

## Core Design Philosophy
- **Unified Identity**: One component (`GlobalNavbar.tsx`) serving all states.
- **Floating Pill**: Fixed position, spanning **80% of the screen width**.
- **Vertical Expansion**: "Drawer-like" expansion for interactions (Search, Brands) instead of layout shifts.
- **Premium Animations**: Fluid, spring-based motion for all size changes.

## Architecture & Flow

```mermaid
graph TD
    A[User Visits Page] --> B{GlobalNavbar (80% Width)}
    B --> C[Left: Logo]
    B --> D[Center: CatalogSearchbar]
    B --> E[Right: Actions User/Cart/Lang]
    
    D -- Click --> F[Expand Vertical Drawer (Search Mode)]
    E -- Click 'Brands' --> G[Expand Vertical Drawer (Brand Grid)]
    
    F --> H[Navbar Height +20vh]
    G --> H
    
    style B fill:#fff,stroke:#000,stroke-width:2px,rx:20
    style F fill:#f9f9f9,stroke:#333,stroke-dasharray: 5 5
```

## Component Breakdown

### 1. `GlobalNavbar.tsx`
The main shell container.
- **Position**: `fixed top-4 left-1/2 -translate-x-1/2`
- **Width**: `w-[80%] max-w-[1400px]`
- **Default Height**: `h-16` (Standard Pill)
- **Expanded Height**: `h-[30vh]` (When Search/Brands active)
- **Visuals**: Glassmorphism (`backdrop-blur-xl bg-white/90`), deep shadow, rounded-full.

### 2. `CatalogSearchbar.tsx`
A focused, minimal search input.
- **Logic**: Simple controlled input.
- **Micro-interaction**: Clicking expands the parent Navbar to show dynamic results below.

## Feature List

| Area | Features | Notes |
| :--- | :--- | :--- |
| **Left** | **Cove Logo** | Clicking resets state & goes Home. |
| **Center** | **Searchbar** | New logic (`CatalogSearchbar`). |
| **Right** | **Auth State** | **Signed In**: Dashboard Btn (User Avatar)<br>**Signed Out**: "Join Us" + "Sign In" |
| **Right** | **Actions** | Brands Icon, HeroScanner Toggle, Cart Icon, Language Icon. |

---

## Step-by-Step Implementation Plan

### Step 1: Cleanup & Deprecation
- [ ] Remove `NavbarController.tsx` logic (scroll listeners).
- [ ] Delete/Archive `FullNavbar` and `IslandNavbar` folders to prevent confusion.
- [ ] Ensure `layout.tsx` is clean of old navbar references.

### Step 2: Create Core Components
- [ ] Build `CatalogSearchbar.tsx`
    - Simple Input field.
    - `onFocus` prop to trigger parent expansion.
- [ ] Build `GlobalNavbar.tsx`
    - Implement the 80% floating shell.
    - Add framer-motion `layout` props for smooth height resizing.
    - Integrate `Clerk` auth logic (Signed In vs Signed Out views).

### Step 3: Integration
- [ ] Mount `GlobalNavbar` in `src/app/layout.tsx` (or `shopping/layout.tsx`).
- [ ] Verify `z-index` layering (must be above Hero sections).

### Step 4: Vertical Expansion Logic
- [ ] Add state `expandedMode`: `'none' | 'search' | 'brands'`.
- [ ] When `expandedMode !== 'none'`, animate height:
    ```javascript
    animate={{ height: expanded ? "300px" : "64px" }}
    ```
- [ ] Render "Drawer Content" (Search Results or Brand Grid) in the newly revealed bottom space.

### Step 5: Visual Polish
- [ ] Add "Dampened Spring" physics to the expansion.
- [ ] Ensure shadows adapt (deeper shadow when expanded).
