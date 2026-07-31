# Frontend

> `CLAUDE.md` §10'dan taşındı. Bu dosya yalnızca `frontend/` altında
> çalışılırken yüklenir. Genel kurallar için kök `CLAUDE.md`.

## 10. Auth & Email Configuration

### Password Reset Flow
- `/sifremi-unuttum` — forgot password page (calls `supabase.auth.resetPasswordForEmail` **client-side** via browser client)
- `/sifre-sifirla` — new password page (server component, checks session; redirects to `/giris` on success)
- `/auth/callback` — handles both `code` (PKCE) and `token_hash` (OTP) flows; reads `next` query param for redirect target
- `AuthListener` in root layout — catches `PASSWORD_RECOVERY` auth event and redirects to `/sifre-sifirla`

**Important:** `resetPasswordForEmail` must be called from the **browser client** (`lib/supabase/client.ts`), NOT from a server action. Calling it server-side breaks the PKCE cookie flow.

### Email Delivery (Resend)
- **Provider:** Resend SMTP via `smtp.resend.com:465`
- **Sender:** `noreply@afrikahaberleri.tr`
- **Sender name:** Afrika Haberleri
- **Domain:** `afrikahaberleri.tr` verified in Resend (DKIM configured)
- **SPF/DMARC:** Not yet added to Natro DNS (pending)
- **Supabase site_url:** `https://www.afrikahaberleri.tr`
- **Recovery email template:** Updated to Turkish HTML with inline styles and `{{ .ConfirmationURL }}` button

### Google OAuth (Custom Proxy)
- **Flow:** Client → `/api/auth/google` → Google → `/api/auth/google/callback` → `supabase.auth.signInWithIdToken` → `/panel`
- **Why custom proxy:** Supabase free plan uses `*.supabase.co` as redirect_uri; custom proxy routes the callback through `afrikahaberleri.tr` so Google shows "Afrika Haberleri" in the account picker instead of the Supabase domain.
- **Env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set in Vercel production)
- **Google Cloud Console:** Authorized redirect URI: `https://www.afrikahaberleri.tr/api/auth/google/callback`
- **Supabase Dashboard:** Authentication → Providers → Google enabled with same Client ID + Secret
- **CSRF protection:** `google_oauth_state` cookie (UUID, httpOnly, 5 min TTL) validated on callback
- Button component: `frontend/components/auth/GoogleSignInButton.tsx` — used in LoginForm and RegisterForm

### Session Persistence
- Middleware matcher covers **all non-static routes** (not just `/panel/*`) so Supabase access tokens are refreshed on every page load via refresh token rotation.

