# How to Test the Choose-Path Flow

## Clear Your Browser Data First! 🔴

Since you've already visited the site, you need to clear localStorage to see the choose-path page:

### Option 1: Clear localStorage in Browser Console
1. Open http://localhost:3002 in your browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Type: `localStorage.clear()`
5. Press Enter
6. Refresh the page (`Ctrl+R` or `F5`)
7. You should now see the choose-path page!

### Option 2: Use Incognito/Private Window
1. Open a new Incognito/Private window (`Ctrl+Shift+N` in Chrome)
2. Go to http://localhost:3002
3. You'll see the choose-path page immediately

---

## What You Should See

### First Visit (After Clearing localStorage):
1. **Choose-Path Page** with two cards:
   - **COVE SHOP** (Pink/Yellow/Blue theme)
   - **COVE PLATFORM** (Green/Black/White theme)
2. Hover over cards to see:
   - Card scales up
   - Background color changes
   - Glow effects appear
3. Click "Start Shopping" → Goes to TesterPage
4. Click "Apply to Sell" → Goes to Partner Onboarding page

### Second Visit (After Choosing a Path):
- Goes directly to TesterPage (shopping experience)
- No choose-path page shown

---

## Summary of All Changes ✅

### 1. Choose-Path Page Features:
- ✅ **New Color Themes:**
  - Shop: Pink/Yellow/Blue gradient
  - Platform: Green/Black/White gradient
- ✅ **Animated Background:** Changes on hover
- ✅ **Full-Height:** No scrolling, single screen
- ✅ **Routing Fixed:**
  - Shop → `/` (TesterPage)
  - Platform → `/partner-onboarding`

### 2. Partner Onboarding Page:
- ✅ **Parallax Scrolling:** Smooth scroll effects
- ✅ **4 Sections:**
  1. Hero with CTA
  2. How It Works (3 steps)
  3. Why Partner (4 benefits)
  4. Final CTA
- ✅ **Green/Black/White Theme:** Consistent branding

### 3. Root Page Flow:
- ✅ **First-time visitors:** Redirected to `/choose-path`
- ✅ **Returning visitors:** See TesterPage directly
- ✅ **Uses localStorage:** `cove_has_visited` flag

---

## Current Status

**Branch:** `feature/cove-onboarding` (pushed to GitHub)
**Dev Server:** http://localhost:3002
**Commits:** 4 total (including the fix)

All requested features are implemented! 🎉
