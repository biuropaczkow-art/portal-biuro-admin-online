/**
 * e-Doręczenia (ADE) Client for Portal BiuroAdmin
 * Łączy frontend Portalu ze skrzynką e-Doręczeń (mikroserwis ADE / KSeF Outbox na porcie 3001).
 * Implementuje ścisłe reguły bezpieczeństwa procesowego (art. 41 i 42 Ustawy o doręczeniach elektronicznych).
 */

export type EdoreczeniaStatus =
  | "AWIZO_OCZEKUJE"      // Nowe pismo na skrzynce ADE, nieodebrane (brak UPD)
  | "ODEBRANE_UPD"        // Odebrano manualnie, wygenerowano UPD, bieg terminu ruszył
  | "FIKCJA_DORECZENIA";  // Minęło 14 dni od awizo, fikcja doręczenia z mocy prawa

export interface EdoreczeniaItem {
  id: string;
  sender: string;
  subject: string;
  caseReference: string;
  receivedAt: string;          // ISO data wpłynięcia do ADE
  fictionDeadlineAt: string;   // receivedAt + 14 dni
  status: EdoreczeniaStatus;
  updGeneratedAt?: string;
  proceduralDaysLimit?: number; // np. 7 lub 14 dni na odpowiedź
  messageId?: string;
  recipient?: string;
  updSignedAt?: string;
  signedBy?: string;
  effectiveDeliveryAt?: string;
  proceduralDeadlineAt?: string;
}

export interface EdoreczeniaDeadlineAlert {
  id: string;
  messageId: string;
  subject: string;
  sender: string;
  recipient: string;
  caseReference: string;
  status: EdoreczeniaStatus;
  alertType: "UPCOMING_FICTION" | "UPCOMING_PROCEDURAL_DEADLINE" | "PROCEDURAL_DEADLINE_EXPIRED";
  targetDeadlineAt: string;
  daysRemaining: number;
  hoursRemaining: number;
  severity: "INFO" | "WARNING" | "CRITICAL" | "EXPIRED";
  description: string;
}

export interface SignUpdResult {
  success: boolean;
  isBackendOnline: boolean;
  message?: EdoreczeniaItem;
  error?: string;
}

export interface EdoreczeniaDeadlinesResult extends Array<EdoreczeniaDeadlineAlert> {
  success: boolean;
  isBackendOnline: boolean;
  deadlines: EdoreczeniaDeadlineAlert[];
  count: number;
  timestamp?: string;
  stats?: {
    totalMessages: number;
    awizoOczekuje: number;
    odebraneUpd: number;
    fikcjaDoreczenia: number;
  };
}

export interface EdoreczeniaMessagesList extends Array<EdoreczeniaItem> {
  isBackendOnline?: boolean;
  source?: "backend" | "offline_mock";
}

const globalProc = typeof globalThis !== "undefined" ? (globalThis as any).process : undefined;

/**
 * Zwraca bezpieczny URL bazowy mikroserwisu e-Doręczeń z fallbackiem do localhost:3001
 */
export function getEdoreczeniaApiUrl(): string {
  if (typeof window !== "undefined" && (window as any).__EDORECZENIA_API_URL__) {
    return (window as any).__EDORECZENIA_API_URL__;
  }
  return (
    globalProc?.env?.NEXT_PUBLIC_EDORECZENIA_API_URL ||
    globalProc?.env?.EDORECZENIA_API_URL ||
    globalProc?.env?.NEXT_PUBLIC_KSEF_API_URL ||
    "http://localhost:3001"
  );
}

export const INITIAL_MOCK_EDORECZENIA_ITEMS: EdoreczeniaItem[] = [
  {
    id: "EDO-2026-11-09-001",
    messageId: "EDO-2026-11-09-001",
    sender: "Urząd Skarbowy w Nysie",
    recipient: "Jarosław Konik Biuro Rachunkowe (ADE: PL-1608-TAX)",
    subject: "Zawiadomienie o zamiarze wszczęcia kontroli podatkowej",
    caseReference: "1608-SPV.410.12.2026",
    receivedAt: "2026-11-09T08:15:00Z",
    fictionDeadlineAt: "2026-11-23T23:59:59Z",
    status: "AWIZO_OCZEKUJE",
    proceduralDaysLimit: 7,
  },
  {
    id: "EDO-2026-11-04-042",
    messageId: "EDO-2026-11-04-042",
    sender: "ZUS Oddział w Opolu",
    recipient: "Jarosław Konik Biuro Rachunkowe (ADE: PL-1608-TAX)",
    subject: "Zawiadomienie o korekcie podstawy wymiaru składek ZUS DRA",
    caseReference: "ZUS-OP-2026-9812",
    receivedAt: "2026-11-04T10:00:00Z",
    fictionDeadlineAt: "2026-11-18T23:59:59Z",
    status: "ODEBRANE_UPD",
    updGeneratedAt: "2026-11-05T14:20:00Z",
    updSignedAt: "2026-11-05T14:20:00Z",
    signedBy: "Jarosław Konik (Doradca Podatkowy)",
    effectiveDeliveryAt: "2026-11-05T14:20:00Z",
    proceduralDeadlineAt: "2026-11-19T14:20:00Z",
    proceduralDaysLimit: 14,
  },
  {
    id: "EDO-2026-10-15-089",
    messageId: "EDO-2026-10-15-089",
    sender: "Sąd Rejonowy w Opolu, Wydział Gospodarczy",
    recipient: "Jarosław Konik Biuro Rachunkowe (ADE: PL-1608-TAX)",
    subject: "Zarządzenie sądu w sprawie wpisu zmian w KRS",
    caseReference: "OP.VIII.Ns-Rej.KRS/1420/26",
    receivedAt: "2026-10-15T09:00:00Z",
    fictionDeadlineAt: "2026-10-29T23:59:59Z",
    status: "FIKCJA_DORECZENIA",
    effectiveDeliveryAt: "2026-10-29T23:59:59Z",
    proceduralDeadlineAt: "2026-11-05T23:59:59Z",
    proceduralDaysLimit: 7,
  },
];

// Stan mockowy w pamięci podręcznej dla trybu offline / demonstracyjnego
let localCacheItems: EdoreczeniaItem[] = JSON.parse(JSON.stringify(INITIAL_MOCK_EDORECZENIA_ITEMS));

/**
 * Resetuje lokalny stan mockowy (przydatne m.in. w testach jednostkowych)
 */
export function resetLocalEdoreczeniaState(): void {
  localCacheItems = JSON.parse(JSON.stringify(INITIAL_MOCK_EDORECZENIA_ITEMS));
}

function normalizeMessage(item: any): EdoreczeniaItem {
  return {
    id: item.id || item.messageId,
    messageId: item.messageId || item.id,
    sender: item.sender || "Nieznany nadawca",
    recipient: item.recipient || "Kancelaria ADE",
    subject: item.subject || "Pismo urzędowe",
    caseReference: item.caseReference || "Brak sygnatury",
    receivedAt: item.receivedAt || new Date().toISOString(),
    fictionDeadlineAt: item.fictionDeadlineAt || new Date(Date.now() + 14 * 86400000).toISOString(),
    status: item.status || "AWIZO_OCZEKUJE",
    updGeneratedAt: item.updGeneratedAt || item.updSignedAt,
    updSignedAt: item.updSignedAt || item.updGeneratedAt,
    signedBy: item.signedBy,
    effectiveDeliveryAt: item.effectiveDeliveryAt,
    proceduralDeadlineAt: item.proceduralDeadlineAt,
    proceduralDaysLimit: item.proceduralDaysLimit ?? 14,
  };
}

/**
 * Pobiera listę pism ADE z mikroserwisu backendowego lub zwraca bufor demo w trybie offline
 */
export async function fetchEdoreczeniaMessages(): Promise<EdoreczeniaMessagesList> {
  const apiBase = getEdoreczeniaApiUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${apiBase}/api/edoreczenia`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.messages || [];
      const normalized = rawList.map(normalizeMessage) as EdoreczeniaMessagesList;
      normalized.isBackendOnline = true;
      normalized.source = "backend";
      return normalized;
    }
  } catch {
    // Backend niedostępny — fallback do bufora lokalnego
  }

  // Fallback offline
  const fallback = JSON.parse(JSON.stringify(localCacheItems)) as EdoreczeniaMessagesList;
  fallback.isBackendOnline = false;
  fallback.source = "offline_mock";
  return fallback;
}

/**
 * Manualne odebranie pisma i wygenerowanie UPD (Urzędowego Poświadczenia Doręczenia).
 * Zgodnie z Audytem A10: zabronione jest automatyczne wywołanie tej funkcji.
 */
export async function signEdoreczeniaUpd(
  messageId: string,
  signedBy: string = "Jarosław Konik (Doradca Podatkowy)"
): Promise<SignUpdResult> {
  const apiBase = getEdoreczeniaApiUrl();
  const trimmedSigner = (signedBy || "Jarosław Konik (Doradca Podatkowy)").trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${apiBase}/api/edoreczenia/${encodeURIComponent(messageId)}/upd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        signedBy: trimmedSigner,
        signedAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      const normalized = normalizeMessage(data.message);
      // Synchronizacja lokalnego bufora
      const idx = localCacheItems.findIndex((i) => i.id === messageId || i.messageId === messageId);
      if (idx !== -1) {
        localCacheItems[idx] = normalized;
      }
      return {
        success: true,
        isBackendOnline: true,
        message: normalized,
      };
    }

    if (res.status === 409 || res.status === 400 || res.status === 404) {
      return {
        success: false,
        isBackendOnline: true,
        error: data.error || `Błąd serwera ADE: HTTP ${res.status}`,
      };
    }
  } catch {
    // Backend niedostępny — obsługa lokalnego bufora offline
  }

  // Tryb offline / demo fallback
  const itemIndex = localCacheItems.findIndex((i) => i.id === messageId || i.messageId === messageId);
  if (itemIndex === -1) {
    return {
      success: false,
      isBackendOnline: false,
      error: `Nie odnaleziono pisma ADE o identyfikatorze: ${messageId}`,
    };
  }

  const target = localCacheItems[itemIndex];

  if (target.status === "ODEBRANE_UPD") {
    return {
      success: false,
      isBackendOnline: false,
      error: `Pismo ${messageId} zostało już wcześniej manualnie odebrane (UPD: ${target.updGeneratedAt}).`,
    };
  }

  if (target.status === "FIKCJA_DORECZENIA") {
    return {
      success: false,
      isBackendOnline: false,
      error: `Zakaz wystawienia UPD: Dla pisma ${messageId} nastąpiła już fikcja doręczenia z mocy prawa (art. 42 ust. 2 UDE).`,
    };
  }

  const nowIso = new Date().toISOString();
  target.status = "ODEBRANE_UPD";
  target.updGeneratedAt = nowIso;
  target.updSignedAt = nowIso;
  target.signedBy = trimmedSigner;
  target.effectiveDeliveryAt = nowIso;

  const limitDays = target.proceduralDaysLimit ?? 14;
  target.proceduralDeadlineAt = new Date(Date.now() + limitDays * 86400000).toISOString();

  localCacheItems[itemIndex] = { ...target };

  return {
    success: true,
    isBackendOnline: false,
    message: { ...target },
  };
}

/**
 * Pobiera alerty o zbliżających się fikcjach doręczeń oraz terminach procesowych
 */
export async function getEdoreczeniaDeadlines(): Promise<EdoreczeniaDeadlinesResult> {
  const apiBase = getEdoreczeniaApiUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${apiBase}/api/edoreczenia/deadlines`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const list = (data.deadlines || []) as EdoreczeniaDeadlineAlert[];
      const result = list as EdoreczeniaDeadlinesResult;
      result.success = true;
      result.isBackendOnline = true;
      result.deadlines = list;
      result.count = list.length;
      result.timestamp = data.timestamp;
      result.stats = data.stats;
      return result;
    }
  } catch {
    // Backend offline — wyliczenie lokalne
  }

  // Wyliczanie lokalne z bufora offline
  const now = new Date();
  const nowMs = now.getTime();
  const localAlerts: EdoreczeniaDeadlineAlert[] = [];

  for (const item of localCacheItems) {
    if (item.status === "AWIZO_OCZEKUJE") {
      const fictionMs = new Date(item.fictionDeadlineAt).getTime();
      const diffMs = fictionMs - nowMs;
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      let severity: "INFO" | "WARNING" | "CRITICAL" | "EXPIRED" = "INFO";
      let desc = `Awizo oczekuje na decyzję. Do fikcji doręczenia pozostało ${daysRemaining} dni (${hoursRemaining}h).`;

      if (hoursRemaining <= 24) {
        severity = "CRITICAL";
        desc = `UWAGA: Mniej niż 24h (${hoursRemaining}h) do nastąpienia fikcji doręczenia art. 42 UDE!`;
      } else if (daysRemaining <= 3) {
        severity = "WARNING";
        desc = `Zbliża się fikcja doręczenia (pozostało ${daysRemaining} dni).`;
      }

      localAlerts.push({
        id: item.id,
        messageId: item.messageId || item.id,
        subject: item.subject,
        sender: item.sender,
        recipient: item.recipient || "Kancelaria BiuroAdmin",
        caseReference: item.caseReference,
        status: item.status,
        alertType: "UPCOMING_FICTION",
        targetDeadlineAt: item.fictionDeadlineAt,
        daysRemaining,
        hoursRemaining,
        severity,
        description: desc,
      });
    } else if (item.proceduralDeadlineAt) {
      const targetMs = new Date(item.proceduralDeadlineAt).getTime();
      const diffMs = targetMs - nowMs;
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let alertType: "UPCOMING_PROCEDURAL_DEADLINE" | "PROCEDURAL_DEADLINE_EXPIRED" =
        diffMs < 0 ? "PROCEDURAL_DEADLINE_EXPIRED" : "UPCOMING_PROCEDURAL_DEADLINE";
      let severity: "INFO" | "WARNING" | "CRITICAL" | "EXPIRED" = "INFO";
      let desc = `Termin na zaskarżenie / odpowiedź upływa za ${daysRemaining} dni.`;

      if (diffMs < 0) {
        severity = "EXPIRED";
        desc = `TERMIN PROCESOWY UPŁYNĄŁ ${Math.abs(daysRemaining)} dni temu (${item.proceduralDeadlineAt}).`;
      } else if (daysRemaining <= 2) {
        severity = "CRITICAL";
        desc = `PILNE: Pozostało tylko ${daysRemaining} dni na zaskarżenie!`;
      } else if (daysRemaining <= 5) {
        severity = "WARNING";
        desc = `Zbliża się termin procesowy (pozostało ${daysRemaining} dni).`;
      }

      localAlerts.push({
        id: item.id,
        messageId: item.messageId || item.id,
        subject: item.subject,
        sender: item.sender,
        recipient: item.recipient || "Kancelaria BiuroAdmin",
        caseReference: item.caseReference,
        status: item.status,
        alertType,
        targetDeadlineAt: item.proceduralDeadlineAt,
        daysRemaining,
        hoursRemaining,
        severity,
        description: desc,
      });
    }
  }

  const result = localAlerts as EdoreczeniaDeadlinesResult;
  result.success = true;
  result.isBackendOnline = false;
  result.deadlines = localAlerts;
  result.count = localAlerts.length;
  result.timestamp = now.toISOString();
  result.stats = {
    totalMessages: localCacheItems.length,
    awizoOczekuje: localCacheItems.filter((i) => i.status === "AWIZO_OCZEKUJE").length,
    odebraneUpd: localCacheItems.filter((i) => i.status === "ODEBRANE_UPD").length,
    fikcjaDoreczenia: localCacheItems.filter((i) => i.status === "FIKCJA_DORECZENIA").length,
  };

  return result;
}
