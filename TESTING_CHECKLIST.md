# 🧪 Game Testing Checklist

## 🔄 What Was Fixed

✅ **Added leaderboard.js script loading** to index.html
✅ **Added error handling** to ChromaMaze initialization  
✅ **Fixed back button path** in ChromaMaze
✅ **Added console logging** for debugging

---

## 📋 Testing Instructions

### Step 1: Clear Cache
```
Before testing, clear your browser cache:
- Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
- Select "All time"
- Check only "Cookies and other site data"
- Click "Clear data"
```

### Step 2: Test Hub Page
Go to: **https://game.youooo.com**

**Verify:**
- [ ] Hub page loads with all 6 games visible
- [ ] Game cards display properly:
  - [ ] Chess ♟
  - [ ] Checkers ⬡
  - [ ] Gems Crush 💎
  - [ ] Snake 🐍
  - [ ] ChromaMaze 🎨 (NEW!)
- [ ] "🏆 Global Leaderboard" button visible
- [ ] All images load properly
- [ ] No console errors (F12 to check)

---

## 🎮 Test Each Game

### Chess ♟
1. Click "Play Chess"
2. Verify chess board loads
3. Try a move
4. **Result:** ✅ Working / ❌ Issue

### Checkers ⬡
1. Click "Play Checkers"
2. Verify checkers board loads
3. Try a move
4. **Result:** ✅ Working / ❌ Issue

### Gems Crush 💎
1. Click "Play Gems Crush"
2. Verify game board loads
3. Try swapping gems
4. **Result:** ✅ Working / ❌ Issue

2. Verify tiles appear
3. Press arrow key to move
4. **Result:** ✅ Working / ❌ Issue

### Snake 🐍
1. Click "Play Snake"
2. Verify snake appears on canvas
3. Try arrow keys to move
4. **Result:** ✅ Working / ❌ Issue

### ChromaMaze 🎨 (NEW!)
1. Click "Play ChromaMaze"
2. **Wait 2 seconds** for page to load
3. Verify:
   - [ ] Game title "ChromaMaze" appears
   - [ ] Canvas/maze visible
   - [ ] Difficulty buttons (Easy/Medium/Hard) visible
   - [ ] Color sequence display visible
   - [ ] Game controls visible
4. Try clicking on the maze/pressing arrows
5. **Result:** ✅ Working / ❌ Issue

---

## 🏆 Test Leaderboards

### On Hub Page
1. Click "🏆 Global Leaderboard" button
2. Verify modal popup appears with tabs:
   - [ ] 🐍 Snake tab
   - [ ] 💎 Gems tab
3. Try clicking different tabs
4. Check if any scores show (might be empty - that's OK)
5. **Result:** ✅ Working / ❌ Issue

---

## 🔍 If ChromaMaze Shows Blank Screen

### Quick Fixes (in order):

**1. Hard Refresh Browser**
```
Windows: Ctrl+Shift+R
Mac: Cmd+Shift+R
```

**2. Check Browser Console (F12)**
- Look for red error messages
- Screenshot the error
- Share with support

**3. Check Network Tab (F12)**
- Go to Network tab
- Reload https://game.youooo.com
- Click "Play ChromaMaze"
- Check if chromamaze.html loads (200 status)
- Check if chromamaze.js loads (200 status)
- If 404: Files not uploaded correctly

**4. Try Different Browser**
- Chrome
- Firefox
- Safari
- Edge
- Mobile browser

**5. Try Incognito/Private Mode**
- Opens fresh without cache
- Rules out cache issues

---

## 🐛 Troubleshooting Guide

### Problem: All games blank/white screen

**Possible Causes:**
1. Cache not cleared
2. Browser JavaScript disabled
3. Game files not loading
4. Browser incompatibility

**Solutions:**
- [ ] Clear cache (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Try different browser
- [ ] Try incognito mode
- [ ] Check F12 console for errors

---

### Problem: ChromaMaze specifically blank

**Check Console (F12 → Console tab):**
- Look for: `"Canvas not found: gameCanvas"`
- Look for: `"Canvas context failed"`
- Look for: Any red error messages

**If you see errors, share the exact message**

---

### Problem: Leaderboard button not working

**Check Console (F12):**
- Look for JavaScript errors
- Should show "leaderboard.js" loaded

**Solutions:**
- [ ] Index.html updated with leaderboard.js script
- [ ] Hard refresh browser
- [ ] Clear cache
- [ ] Try incognito mode

---

### Problem: Games load but don't respond to input

**Check:**
- [ ] Canvas/board visible
- [ ] Buttons clickable
- [ ] Keyboard working (arrow keys, etc.)
- [ ] Try different input method

---

## ✅ Success Criteria

### All 6 Games Working When:
- ✅ All games load without errors
- ✅ Each game responds to player input
- ✅ Game boards/canvases render properly
- ✅ Back/Home buttons work
- ✅ No console errors (F12)

### Leaderboards Working When:
- ✅ Modal appears when button clicked
- ✅ Tabs switch between games
- ✅ No console errors
- ✅ Loads without lag

### ChromaMaze Working When:
- ✅ Game page loads (not blank)
- ✅ Canvas/maze visible
- ✅ Difficulty buttons clickable
- ✅ Can click maze tiles or use arrow keys
- ✅ Game responds to input
- ✅ Back button returns to hub

---

## 📞 Reporting Issues

**If something doesn't work, provide:**

1. **What you clicked/did**
2. **What you expected to happen**
3. **What actually happened**
4. **Browser and device**
5. **Screenshot of error (if applicable)**
6. **Console errors (F12 → Console)**

**Example:**
```
Game: ChromaMaze
Action: Clicked "Play ChromaMaze"
Expected: Game page loads with canvas
Actually: Blank white page
Browser: Chrome on MacBook
Error: (screenshot attached)
```

---

## 🚀 Expected Results

After fixes are deployed (~5-10 minutes):

| Game | Expected Status |
|------|-----------------|
| Chess | ✅ Should work |
| Checkers | ✅ Should work |
| Gems Crush | ✅ Should work |
| Snake | ✅ Should work |
| ChromaMaze | ✅ Should work (if cache cleared) |
| Leaderboards | ✅ Should work (if cache cleared) |

---

## 📝 Notes

- **First time?** Clear cache before testing
- **Still broken?** Try incognito mode
- **Works in incognito?** Your cache needs clearing
- **Still doesn't work?** Check F12 console for errors
- **Weird colors/layout?** Try different zoom level (Ctrl+0 to reset)

---

**Testing Date:** ___________
**Tester:** ___________
**Result:** ✅ All Pass / ❌ Issues Found

**If issues found, please describe:**
_________________________________________
_________________________________________
_________________________________________

---

Version: 1.0
Last Updated: April 24, 2026
