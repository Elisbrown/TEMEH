# 🧪 LoungeOS QA Master Checklist v3.0

**Status**: ACTIVE | **Priority**: P0 | **Tester**: ******\_\_\_\_******

## 🏁 1. Installation & Smoke Test (Dev/Deployment)

**Target**: Ensure the environment spins up correctly.

- [ ] **TC-001**: **Dependency Install**. Run `npm install`. Verify no peer dependency conflicts or critical errors.
- [ ] **TC-002**: **Database Init**. Run `npm run db:init`. Verify `.db` (SQLite) file is created in the correct directory.
- [ ] **TC-003**: **Seeding**. Run `npm run db:seed`. Verify database is populated with the default 8 users and basic categories.
- [ ] **TC-004**: **Build & Start**. Run `npm run build` and `npm run start`. Ensure no hydration errors occur on startup relative to UI mismatch.
- [ ] **TC-005**: **Default Login**. Attempt login with `superadmin@lounge.com` / `password`.
- [ ] **TC-006**: **Core Navigation**. Navigate to Dashboard, POS, Kitchen, Admin. Verify no 404s.

---

## 🌍 2. Core Infrastructure & Offline Capabilities

**Target**: Verify the "100% Offline" and Localization promises.

- [ ] **TC-007 (CRITICAL)**: **The "Cable Pull" Test**. Disconnect internet. Perform full sales cycle (Order -> Payment -> Receipt).
- [ ] **TC-008**: **Data Persistence**. Restart local server/machine. Verify previous session data (orders/logs) is still present.
- [ ] **TC-009**: **Default Language**. Clear browser cache/local storage. Load app. Verify UI is in **French** (System Default).
- [ ] **TC-010**: **Language Toggle**. Switch to English. Refresh page. Verify English persists (Local Storage check).
- [ ] **TC-011**: **Responsiveness (Tablet)**. Test on iPad/Android Tablet resolution. Verify touch targets are at least 44x44px.
- [ ] **TC-012**: **Responsiveness (Mobile)**. Verify "Condensed Views" for mobile layouts (Dashboard cards stack, Menu becomes hamburger).

---

## 🔐 3. Authentication & RBAC Matrix

**Target**: Ensure users only see what they are paid to see.

### General Auth

- [ ] **TC-013**: **First Login**. Login as newly created staff. Verify **Forced Password Change** modal appears.
- [ ] **TC-014**: **Session Timeout**. Leave system idle for 2 hours + 1 minute. Verify auto-logout.
- [ ] **TC-015 (Security)**: **Encryption**. Check database file directly. Verify passwords are hashed (Bcrypt) and not plain text.
- [ ] **TC-016 (Security)**: **URL Manipulation**. Login as _Waiter_, manually type `/dashboard/configuration`. Verify 403 or Redirect.

### Role-Specific Boundaries (Negative Tests)

- [ ] **TC-017**: **Waiter**. Log in. Try to access `/dashboard/accounting`. Should redirect to 403/404 or Dashboard.
- [ ] **TC-018**: **Chef**. Log in. Verify inability to see Sales Reports or Accounting.
- [ ] **TC-019**: **Stock Manager**. Verify Read/Write access to Inventory but **No Access** to POS cash handling.
- [ ] **TC-020**: **Manager vs Admin**. Verify Manager can edit staff but **cannot** delete the Super Admin account.

---

## 💳 4. Point of Sale (POS) - The Money Maker

**Target**: Transaction accuracy and speed.

- [ ] **TC-021**: **Product Grid**. Verify images load. Verify "Out of Stock" items are visually distinct or unselectable.
- [ ] **TC-022**: **Cart Operations**. Add item, increase quantity, decrease quantity, remove item. (Stress test: Add 20 items quickly).
- [ ] **TC-023**: **Split Payment**. Split bill (e.g., 50% Cash, 50% Orange Money). Verify total equals order amount.
- [ ] **TC-024**: **Mobile Money**. Select MTN/Orange Money. Verify workflow allows recording transaction reference.
- [ ] **TC-025**: **Receipt Generation**. Print receipt. Verify:
  - [ ] Business Info & Address correct
  - [ ] Currency formatted (e.g., 10 000 FCFA)
  - [ ] Transaction ID is unique
  - [ ] Waiter name is correct
  - [ ] Tax lines are accurate
- [ ] **TC-026 (CRITICAL)**: **Stock Deduction Integration**. Complete sale of 2 beers. Immediately check Inventory. Count **must** decrease by 2.
- [ ] **TC-027**: **Max Int Overflow**. Add quantity `9999` of an item. Verify frontend handles gracefully.

---

## 🍳 5. Kitchen & Bar Display Systems (KDS)

**Target**: Workflow efficiency and synchronization.

- [ ] **TC-028**: **Real-Time Sync**. Open POS in Window A, Kitchen in Window B. Place order. Verify it appears on Kitchen board (Target: < 30s).
- [ ] **TC-029**: **Sound Alerts**. Verify sound plays when new ticket arrives.
- [ ] **TC-030**: **Drag & Drop**. Move ticket "Pending" -> "In Progress". Verify state change persists.
- [ ] **TC-031**: **Filtering**.
  - [ ] Kitchen View shows **Food** only.
  - [ ] Bar View shows **Drinks** only.
- [ ] **TC-032**: **Completion**. Move to "Completed". Verify order status updates in main Dashboard orders table.

---

## � 6. Inventory & Suppliers

**Target**: Stock accuracy & Supply Chain.

- [ ] **TC-033**: **CRUD Operations**. Create Item, Edit Item, Delete Item.
- [ ] **TC-034**: **CSV Import**.
  - [ ] Upload valid CSV. Verify items appear.
  - [ ] Upload CSV with new category. Verify category auto-created.
  - [ ] Upload CSV with invalid data (e.g. text in price column). Verify clean error handling.
- [ ] **TC-035**: **Low Stock Logic**. Set item quantity < Minimum Level. Verify appearance in "Low Stock Alerts" on Dashboard.
- [ ] **TC-036**: **Stock Movement**. Perform "Stock IN" (purchase). Verify quantity updates. Verify Cost Per Unit updates (if weighted average enabled).
- [ ] **TC-037**: **Ingredient Logic**. (If applicable) Verify selling a composite item deducts raw ingredients.

---

## 💰 7. Accounting & Financials

**Target**: Math accuracy.

- [ ] **TC-038**: **Currency Rendering**. Verify all 6 supported currencies render symbols correctly (especially XAF, USD, EUR).
- [ ] **TC-039**: **Tax Calculation**. Enable VAT (19%). Create order. Verify: `Subtotal + (Subtotal * 0.19) = Total`.
- [ ] **TC-040**: **Expense Tracking**. Create manual expense. Attach file (image). Verify it saves locally.
- [ ] **TC-041**: **P&L Report**. Generate Income Statement. Verify `Total Revenue - Total Expenses = Net Profit`.
- [ ] **TC-042**: **Journal Entries**. Create generic debit/credit entry. Verify double-entry balance check.

---

## 📊 8. Reporting & Analytics

**Target**: Data visualization accuracy.

- [ ] **TC-043**: **Date Filters**. Filter "Last 7 Days". Compare total against manual sum of orders in that period.
- [ ] **TC-044**: **Exporting**.
  - [ ] **CSV**: Open in Excel. Verify columns align.
  - [ ] **PDF**: Open. Verify layout fits A4, legible, professional formatting.
- [ ] **TC-045**: **Staff Performance**. Process 3 orders with "Waiter A". Check Staff Report. Verify total matches.

---

## ⚙️ 9. Configuration & System Health

**Target**: Settings and disaster recovery.

- [ ] **TC-046**: **Business Settings**. Change Logo and Address. Print receipt. Verify new details.
- [ ] **TC-047**: **Backup (Auto)**. Check backup folder. Verify timestamped `.db` file exists for today.
- [ ] **TC-048**: **Backup (Manual)**. Trigger "Export All Data". Verify download completes.
- [ ] **TC-049 (CRITICAL RISK)**: **Restore**.
  1. Make significant change (Add User "Test User").
  2. Restore from backup taken _before_ change.
  3. Verify "Test User" is **GONE**.
- [ ] **TC-050**: **Logs**. Perform "Force Password Change" on user. Verify Activity Log records Action, Admin ID, and Timestamp.

---

## 🎨 10. UI/UX & Design System

**Target**: Visual polish (Shadcn/Tailwind).

- [ ] **TC-051**: **Dark Mode**. Toggle Dark Mode. Check forms/modals. Ensure no "white text on white background".
- [ ] **TC-052**: **Empty States**. Go to "Events" (empty DB). Verify friendly "No items found" message/illustration.
- [ ] **TC-053**: **Error Handling**. Intentionally malform form data (e.g. Email without @). Verify Zod validation messages in Red.
- [ ] **TC-054**: **Input Security (XSS)**. Input `<script>alert(1)</script>` into Product Name. Verify it renders as text, does not execute.

---

## � 11. End-to-End (E2E) Workflow

### Scenario: "The Full Night Shift"

1. [ ] **Setup**: Admin opens shift, verifies 1000 XAF in cash drawer.
2. [ ] **Service**: Waiter takes order (Food + Drink) -> Kitchen/Bar make -> Waiter delivers.
3. [ ] **Change**: Customer moves tables. Split bill.
4. [ ] **Payment**: Mixed payment (Cash + Mobile).
5. [ ] **Inventory**: Manager notices low stock -> orders more (Stock IN).
6. [ ] **Close**: Admin pulls Sales Report. Verifies Cash calculated matches Cash in hand.
7. [ ] **Backup**: System auto-backs up at configured time.

**Verified By**: **********\_********** **Date**: ****\_\_\_****
