# Phase 5A — Smoke Test Checklist

Manual QA for verifying Phase 5A still works end-to-end. Run before:

- Any large refactor commit
- Phase 5B kickoff (baseline confirmation)
- Onboarding a new dev / new machine

**Estimated time**: 15-20 min full run.

---

## Pre-requisites

Before starting:

- [ ] BE running locally on `http://localhost:8080`.
- [ ] BE database has V1_0_x migrations applied (in particular `V1_0_8` tab_key column + `V1_0_9` menu seed + tenant `Default` seeded with `websites = ["localhost:5173", ...]`).
- [ ] `pnpm dev` running, dev server on `http://localhost:5173`.
- [ ] Browser DevTools console open (catch errors).
- [ ] Test credentials: `admin` / `admin123`.

If any pre-req fails, fix that first — most likely BE issue.

---

## Section A — Happy path (8 main steps)

### Step 1 — Boot fresh

**Setup**:

1. `localStorage.clear()` in console.
2. F5 reload.

**Expected**:

- Brief spinner or blank flash (under 100ms).
- LoginPage renders centered. Brand wordmark "Soar" in primary blue + subtitle "Admin Console".
- DevTools Network tab: 1 call to `GET /admin-api/system/tenant/get-by-website?website=localhost:5173` → 200 OK.
- Response body: `{ code: 0, data: { id: 1, name: "Soar" }, msg: "" }`.
- Address bar: `/login?redirect=%2F` (AuthGuard redirected from `/`).
- localStorage now has `SOAR_TENANT_ID=1`.

**Failure cases**:

- CORS error → BE CORS config missing.
- 404 on tenant endpoint → BE migration not applied or endpoint not deployed.
- TenantErrorPage shows → hostname not in seed; check `system_tenant.websites` JSONB array.

---

### Step 2 — Login happy path

**Setup**: from LoginPage (after Step 1).

**Action**: form pre-fills `admin/admin123` in dev mode. Click "Sign in".

**Expected**:

- Submit button shows loading spinner ~200ms.
- DevTools Network:
  - `POST /admin-api/system/auth/login` → 200, returns tokens.
  - `GET /admin-api/system/auth/get-permission-info` → 200, returns user/roles/permissions/menus.
- Address bar → `/` (or whatever redirect param was).
- AppShell renders:
  - Left: dark sider 240px wide, "Soar" logo at top, menu tree below (System group, Infrastructure group, ...).
  - Top: header bar with sider toggle (left) + Avatar "A" + "admin" + caret (right).
  - Center: welcome banner "Welcome to Soar — Select a menu item from the sidebar to get started."
- Console: no red errors.
- localStorage:
  ```
  SOAR_ACCESS_TOKEN  = "<jwt>"
  SOAR_REFRESH_TOKEN = "<jwt>"
  SOAR_TENANT_ID     = "1"
  persist:soar:auth  = "<json with user, permissions, menus>"
  persist:soar:theme = "<json>"
  ```

---

### Step 3 — Sider menu click → URL change

**Setup**: logged in, on `/`.

**Action**:

1. Click "System" parent group → expands children (User Management, Role Management, Menu Management, ...).
2. Click "User Management" leaf.

**Expected**:

- URL → `/?tab=system-user`.
- Brief Suspense spinner in content area (lazy load).
- Content area renders **User Management Card** (real page from `pages/system/user/index.tsx`).
- Sider highlights "User Management" in primary color.

**Continue**: 3. Click "Role Management" → URL → `/?tab=system-role`. Content shows "Coming soon" (placeholder fallback — page file doesn't exist unless C4 was applied). 4. Click "User Management" again → instant load (no Spin — lazyPages map hit), content shows user page.

**Verify** parent group click does NOT navigate: 5. Click "System" group title (the parent itself, not a child). URL should NOT change. Group toggles expand/collapse.

---

### Step 4 — Theme toggle + persist

**Setup**: logged in.

**Action**:

1. Click avatar dropdown in header → Theme → Dark.

**Expected**:

- Whole UI switches to dark mode immediately (sider background, content background, button colors, etc.).
- Wordmark "Soar" on login page still primary blue (token consistent).

**Continue**: 2. F5 reload.

**Expected**:

- After rehydrate, app stays in dark mode.
- localStorage `persist:soar:theme` contains `mode: "dark"`.

**Reset**: toggle back to Light for next steps if preferred.

---

### Step 5 — Language toggle + persist

**Action**:

1. Avatar dropdown → Language → Tiếng Việt.

**Expected**:

- Dropdown closes.
- Open dropdown again: items show in Vietnamese ("Đăng xuất", "Giao diện", "Ngôn ngữ").
- Form labels (if visit `/login`): also Vietnamese ("Tên đăng nhập", "Mật khẩu", "Đăng nhập").
- Welcome banner translates to "Chào mừng đến với Soar".

**Note**: Sider menu labels stay English (raw BE strings — tech debt #14, expected).

**Continue**: 2. F5 → still vi. 3. localStorage `i18nextLng = "vi"`.

**Reset**: switch back to English for next steps.

---

### Step 6 — Sider collapse + persist

**Action**:

1. Click sider toggle button (hamburger icon, top-left of header).

**Expected**:

- Sider collapses from 240px → 64px.
- "Soar" logo → "S".
- Menu items show icons only, labels hide.
- Hover on icon → tooltip with label.

**Continue**: 2. F5 → sider stays collapsed. 3. Toggle again to expand. 4. F5 → sider expanded. 5. localStorage `persist:soar:theme` includes `siderCollapsed`.

---

### Step 7 — Deep link logged out

**Setup**: logged in on User Management page (`/?tab=system-user`).

**Action**:

1. Copy URL.
2. Header dropdown → Sign out. Verify URL becomes `/login` (clean, no `?redirect=` noise).
3. Paste original URL `/?tab=system-user` into address bar. Enter.

**Expected**:

- AuthGuard sees not authed → redirects to `/login?redirect=%2F%3Ftab%3Dsystem-user`.
- LoginPage renders. Address bar shows the encoded redirect.

**Continue**: 4. Login with admin/admin123.

**Expected**:

- After login, navigate decodes `?redirect=` → `/?tab=system-user`.
- AppShell renders, content shows User Management page, sider highlights "User Management".

---

### Step 8 — Logout flow

**Action**: avatar dropdown → Sign out.

**Expected**:

- `dispatch(logout())` runs.
- DevTools Network: `POST /admin-api/system/auth/logout` (best-effort).
- URL → `/login` (NOT `/login?redirect=%2F` — explicit navigate from header).
- LoginPage renders fresh.
- localStorage:
  ```
  SOAR_ACCESS_TOKEN  = (removed)
  SOAR_REFRESH_TOKEN = (removed)
  SOAR_TENANT_ID     = "1"  ← survives logout ✅
  persist:soar:auth  = "<reset to initialState>"
  persist:soar:theme = "<unchanged>"
  ```

---

## Section B — Edge cases

### E1 — Wrong credentials

**Action**: at LoginPage, enter `admin` / `wrong-password`. Submit.

**Expected**:

- Network: `POST /auth/login` returns 200 with `data.code` non-zero (e.g., 1002003).
- antd toast (red) at top: error msg from BE (e.g., "登录密码不正确" or English equivalent).
- Form stays mounted. Submit button no longer loading. Inputs not cleared.
- localStorage unchanged (no tokens written).

---

### E2 — Token refresh single-flight

**Setup**: logged in.

**Action**:

1. Open console.
2. Corrupt the access token (refresh token still valid):
   ```js
   localStorage.setItem('SOAR_ACCESS_TOKEN', 'invalid-token-xyz')
   ```
3. Click a menu to trigger an API request (e.g., navigate to a tab that fetches).

   Or via console:

   ```js
   const { authApi } = await import('/src/features/auth/api/auth-api.ts')
   const info = await authApi.getPermissionInfo()
   console.log(info.user.username)
   ```

**Expected**:

- Network panel shows:
  - First `get-permission-info` → 200 with `data.code: 401` (auth-interceptor catches).
  - `POST /auth/refresh-token` → 200 with new tokens.
  - Retry `get-permission-info` → 200 with `data.code: 0` (success).
- Console returns user info OK.
- localStorage `SOAR_ACCESS_TOKEN` now has the NEW token (not the corrupted one).

---

### E3 — Refresh fails → Session expired modal

**Setup**: logged in.

**Action**:

1. Console:
   ```js
   localStorage.setItem('SOAR_ACCESS_TOKEN', 'invalid')
   localStorage.setItem('SOAR_REFRESH_TOKEN', 'invalid')
   ```
2. Trigger an API request (refresh page, or click menu).

**Expected**:

- Network: first call returns 401, refresh call returns 401 (or business error).
- antd Modal.confirm appears centered: "Session expired" + "Your session has expired. Please log in again." + [Log in] [Cancel].

**Continue**: 3. Click [Log in].

**Expected**:

- Modal closes.
- `dispatch(logout())` runs.
- URL → `/login`.
- localStorage `SOAR_ACCESS_TOKEN` / `SOAR_REFRESH_TOKEN` removed. `SOAR_TENANT_ID` survives.

---

### E4 — Tenant resolve fail

**Action**: open browser to `http://127.0.0.1:5173/` (different hostname — not in seed).

**Expected**:

- Console: `localStorage.removeItem('SOAR_TENANT_ID')` then F5.
- Spinner ~100ms.
- Network: `get-by-website?website=127.0.0.1:5173` returns `{ code: 0, data: null, msg: "" }`.
- TenantErrorPage renders centered:
  - Red error icon.
  - "Tenant not configured for this domain".
  - "Hostname: 127.0.0.1:5173".
  - [Refresh] button.

**Continue**:

- Click Refresh → reloads → same error (no fix without BE seed change).

---

### E5 — Bogus URL → 404

**Action**: visit `http://localhost:5173/this-route-does-not-exist`.

**Expected**:

- NotFoundPage renders centered: 404 + "Page not found" + [Back to Home] button.
- Click button → navigates to `/` → AppShell (if logged in) or login redirect.

---

### E6 — Unknown tab → warning fallback

**Setup**: logged in on AppShell.

**Action**: address bar → `http://localhost:5173/?tab=this-does-not-exist`.

**Expected**:

- Content area renders warning Result: "Unknown page: this-does-not-exist" + hint "Try selecting a menu item from the sidebar."
- Sider has NO item highlighted.
- Other layout elements (sider, header) work normally.

**Note**: this is NOT routed to NotFoundPage — `/` route matched, tab fallback inside TabRenderer.

---

## Section C — Verify checklist

After running all sections, tick:

- [ ] Section A 8 steps pass.
- [ ] Section B 6 edge cases pass.
- [ ] No red errors in console at any point.
- [ ] No CORS warnings.
- [ ] Network panel shows expected calls only (no spam, no duplicates from React strict mode).
- [ ] localStorage matches expected state at each checkpoint.
- [ ] Both light and dark mode work for ALL pages (login, AppShell, error pages).
- [ ] Both English and Vietnamese display correctly (note: menu labels stay English — tech debt #14).

If all checked → Phase 5A baseline is healthy. Proceed.

If any fails → investigate. Common causes:

- BE migration drift (V1_0_8/V1_0_9 not applied).
- Stale localStorage from previous version (try `localStorage.clear()`).
- BE not running / wrong port.
- Tenant seed missing current hostname in `websites` array.

---

## Section D — Performance baseline (optional)

For future regression comparison:

| Metric                         | Phase 5A baseline                   | Tool                 |
| ------------------------------ | ----------------------------------- | -------------------- |
| Cold load → LoginPage visible  | ~200-400ms                          | DevTools Performance |
| Login click → AppShell visible | ~300-500ms (2 sequential API calls) | DevTools Network     |
| Tab switch (cached)            | <50ms                               | React Profiler       |
| Tab switch (first load)        | ~100-200ms (lazy chunk)             | DevTools Network     |
| F5 reload → AppShell visible   | ~150-300ms                          | DevTools Performance |

Numbers vary by machine. Record baseline once, compare for regressions.

---

**Phase 5A smoke test complete.**

Save this doc as `docs/PHASE_5A_SMOKE_TEST.md`. Re-run before Phase 5B kickoff to confirm baseline.
