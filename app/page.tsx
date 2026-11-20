"use client";

import React, { useState } from "react";
import { ArrowRight, ShieldCheck, Lock, FileText, Landmark, FolderLock } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleGoogleLogin = () => {
    // Official Google OAuth redirect with fallback to demo workspace
    const config = (typeof window !== "undefined" && (window as any).PORTAL_CONFIG) || {};
    const googleClientId =
      config.GOOGLE_CLIENT_ID ||
      (typeof window !== "undefined" && (window as any).GOOGLE_CLIENT_ID) ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (googleClientId && googleClientId.trim().length > 10) {
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
      const scope = encodeURIComponent("openid email profile");
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    } else {
      window.location.href = "/demo?auth=google";
    }
  };

  return (
    <div className="hero-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* Nawigacja */}
      <nav className="nav-wrap" aria-label="Główna nawigacja">
        <a className="brand" href="/" aria-label="Biuro Rachunkowe Jarosław Konik — strona główna">
          <span className="brand-mark">JK</span>
          <span>
            Jarosław Konik
            <br />
            <small>Biuro Rachunkowe</small>
          </span>
        </a>

        <div className="nav-links">
          <a href="#jak-dziala">Jak to działa</a>
          <a href="#moduly">Obszary portalu</a>
          <a href="/demo">Pulpit Demo</a>
          <a href="#kontakt">Kontakt</a>
        </div>

        <a className="primary" href="/demo">
          Wejdź do portalu <ArrowRight size={16} />
        </a>
      </nav>

      {/* Hero Grid */}
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">PRAWIE 23 LATA DOŚWIADCZENIA · OD 2003 ROKU</div>
          <h1>
            Administracja,
            <br />
            która daje Ci
            <br />
            <em>spokój.</em>
          </h1>
          <p>
            Bezpieczna przestrzeń Twojej firmy do dokumentów i rozliczeń. ZUS, KSeF i archiwum mają osobne
            zakładki, więc od razu wiesz, gdzie załatwić daną sprawę.
          </p>

          <div className="hero-actions">
            <a className="primary" href="/demo">
              Wypróbuj wersję demonstracyjną <ArrowRight size={16} />
            </a>
            <a className="secondary" href="#moduly">
              Zobacz moduły portalu
            </a>
          </div>

          <div className="trust-line">
            <ShieldCheck size={18} />
            <span>NIP 7532190370 · Bezpieczny dostęp i poufność danych klientów biura</span>
          </div>
        </div>

        {/* Login / Registration Card */}
        <div className="login-stage">
          <div className="orb orb-one" />
          <div className="orb orb-two" />

          <div className="login-card">
            <div className="login-top">
              <span className="brand-mark">JK</span>
              <div className="secure-pill">
                <span className="pulse" /> STREFA KLIENTA
              </div>
            </div>

            <div className="login-heading">
              <div>
                <h2>{isRegister ? "Załóż konto" : "Zaloguj się"}</h2>
                <p>
                  {isRegister
                    ? "Utwórz dostęp do przestrzeni swojej firmy"
                    : "Wpisz dane, aby przejść do dokumentów i rozliczeń"}
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/demo";
              }}
            >
              <label htmlFor="email">Adres e-mail</label>
              <input
                id="email"
                type="email"
                required
                placeholder="jan@twojafirma.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label htmlFor="password" style={{ marginTop: "12px", display: "block" }}>
                Hasło
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="login-options">
                <label className="remember">
                  <input type="checkbox" defaultChecked />
                  Zapamiętaj mnie
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsRegister(!isRegister);
                  }}
                  style={{ color: "var(--green)" }}
                >
                  {isRegister ? "Masz już konto? Zaloguj się" : "Nowy klient? Załóż konto"}
                </a>
              </div>

              <button type="submit" className="login-button">
                <Lock size={16} />
                {isRegister ? "Zarejestruj i przejdź do portalu" : "Zaloguj się do portalu"}
              </button>
            </form>

            <div className="auth-divider">
              <span>lub kontynuuj przez</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Zaloguj się przez konto Google
            </button>

            <button
              type="button"
              className="chatgpt-button"
              onClick={() => {
                window.location.href = "/signin-with-chatgpt?return_to=%2Fdemo";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
                />
              </svg>
              Zaloguj się przez ChatGPT
            </button>

            <div className="login-foot">
              <span>Chcesz sprawdzić jak to działa?</span>
              <a href="/demo" style={{ color: "var(--green)", fontWeight: 700 }}>
                Otwórz panel demo →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Obszary portalu */}
      <section id="moduly" className="modules-section">
        <div className="section-intro">
          <span>TRZY ODDZIELNE OBSZARY</span>
          <h2>
            Każda sprawa
            <br />
            na swoim miejscu.
          </h2>
          <p>
            Po zalogowaniu przechodzisz bezpośrednio do wybranej zakładki. Pulpit pokazuje podsumowanie, a szczegóły
            pozostają w odpowiednim module.
          </p>
        </div>

        <div className="module-grid">
          <article className="module-card">
            <span className="module-number">01</span>
            <FileText size={32} />
            <h3>KSeF</h3>
            <p>
              Osobny obszar do konfiguracji połączenia i synchronizacji metadanych faktur. Pełna kontrola nad obiegiem
              faktur ustrukturyzowanych.
            </p>
            <a href="/demo?role=client&tab=ksef" aria-label="Otwórz moduł KSeF w panelu demonstracyjnym">
              Zobacz w demo <ArrowRight size={14} />
            </a>
          </article>

          <article className="module-card">
            <span className="module-number">02</span>
            <Landmark size={32} />
            <h3>e-ZUS</h3>
            <p>
              Obszar składek, pracowników, e-ZLA oraz rozliczeń kadrowo-płacowych. Bezpieczny obieg informacji
              związanych z ubezpieczeniami społecznymi.
            </p>
            <a href="/demo?role=client&tab=zus" aria-label="Otwórz moduł e-ZUS w panelu demonstracyjnym">
              Zobacz w demo <ArrowRight size={14} />
            </a>
          </article>

          <article className="module-card">
            <span className="module-number">03</span>
            <FolderLock size={32} />
            <h3>Dokumenty</h3>
            <p>
              Prywatne archiwum firmy: bezpieczne dodawanie plików, podgląd historii i bezpośrednia wymiana wiadomości
              z księgowym.
            </p>
            <a href="/demo?role=client&tab=documents" aria-label="Otwórz moduł Dokumenty w panelu demonstracyjnym">
              Zobacz w demo <ArrowRight size={14} />
            </a>
          </article>
        </div>
      </section>

      {/* Stopka */}
      <footer id="kontakt">
        <div>
          <strong>Biuro Rachunkowe Jarosław Konik</strong>
          <br />
          <span>NIP: 7532190370 · Świadczymy usługi księgowe od 2003 roku</span>
        </div>
        <div>
          <span>Kontakt: </span>
          <a href="mailto:kontakt@biuroadmin.online" style={{ textDecoration: "underline" }}>
            kontakt@biuroadmin.online
          </a>
        </div>
        <div>
          <span>© 2026 Biuro Rachunkowe Jarosław Konik. Wszelkie prawa zastrzeżone.</span>
        </div>
      </footer>
    </div>
  );
}
