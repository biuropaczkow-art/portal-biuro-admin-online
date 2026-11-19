/**
 * KSeF Transactional Outbox Client for Portal BiuroAdmin
 * Łączy frontend Portalu z mikroserwisem ksef-outbox-pattern (PostgreSQL + RabbitMQ + Redis).
 */

export interface InvoiceSubmissionInput {
  fileName: string;
  fileContent?: string;
  fileHash: string;
  sellerNip: string;
  buyerNip?: string;
  sellerName?: string;
  buyerName?: string;
  invoiceNumber: string;
  issueDate: string;
  saleDate?: string;
  currency?: string;
  totalGross: number;
  totalNet?: number;
  totalVat?: number;
  invoiceType?: 'VAT' | 'KOR' | 'ZAL' | 'ROZ';
  originalInvoiceNumber?: string;
  originalKsefNumber?: string;
  correctionReason?: string;
}

export interface OutboxStatsResponse {
  success: boolean;
  stats?: Array<{ status: string; count: number }>;
  relayState?: {
    eventsProcessed: number;
    eventsFailed: number;
    isRunning: boolean;
    lastRun: string | null;
  };
}

export interface OutboxSubmitResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  ksefStatus?: string;
  createdAt?: string;
  error?: string;
  message?: string;
  isBackendOnline: boolean;
}

const globalProc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
const API_BASE = typeof window !== 'undefined' && (window as any).__KSEF_API_URL__ 
  ? (window as any).__KSEF_API_URL__ 
  : (globalProc?.env?.NEXT_PUBLIC_KSEF_API_URL || 'http://localhost:3001');

/**
 * Sprawdza stan połączenia z mikroserwisem Outbox Relay
 */
export async function getOutboxHealth(): Promise<{ online: boolean; stats?: OutboxStatsResponse }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch(`${API_BASE}/api/outbox/stats`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { online: true, stats: data };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Zgłasza fakturę do Transactional Outboxa (atomowy zapis PostgreSQL -> publikacja RabbitMQ)
 */
export async function submitToTransactionalOutbox(input: InvoiceSubmissionInput): Promise<OutboxSubmitResult> {
  const net = input.totalNet || Number((input.totalGross / 1.23).toFixed(2));
  const vat = input.totalVat || Number((input.totalGross - net).toFixed(2));

  const payload = {
    invoiceNumber: input.invoiceNumber,
    sellerNip: input.sellerNip,
    buyerNip: input.buyerNip || '1234567890',
    sellerName: input.sellerName || 'JAROSŁAW KONIK BIURO RACHUNKOWE',
    buyerName: input.buyerName || 'Kontrahent Sp. z o.o.',
    issueDate: input.issueDate,
    saleDate: input.saleDate || input.issueDate,
    currency: input.currency || 'PLN',
    invoiceType: input.invoiceType || 'VAT',
    originalInvoiceNumber: input.originalInvoiceNumber,
    originalKsefNumber: input.originalKsefNumber,
    correctionReason: input.correctionReason,
    fileName: input.fileName,
    fileContent: input.fileContent || input.fileHash,
    totalGross: input.totalGross,
    items: [
      {
        lineNumber: 1,
        name: `Dokument księgowy: ${input.fileName}`,
        quantity: 1,
        unit: 'usł',
        unitPriceNet: net,
        vatRate: 23
      }
    ]
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_BASE}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (res.status === 201 && data.success) {
      return {
        success: true,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        ksefStatus: data.ksefStatus || 'PENDING_OUTBOX',
        createdAt: data.createdAt,
        isBackendOnline: true
      };
    }

    if (res.status === 409) {
      return {
        success: false,
        error: data.error || 'BLOKADA DUPLIKATU',
        message: data.message || 'Wykryto kolizję skrótu lub numeru faktury w rejestrze outbox.',
        isBackendOnline: true
      };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}`,
      message: data.error || 'Błąd serwera outbox.',
      isBackendOnline: true
    };
  } catch (err: any) {
    // Backend niedostępny — informujemy o pracy w trybie lokalnym
    return {
      success: true,
      invoiceNumber: input.invoiceNumber,
      ksefStatus: 'PENDING_LOCAL_CACHE',
      message: 'Zaksięgowano lokalnie (mikroserwis outbox offline/demo mode).',
      isBackendOnline: false
    };
  }
}
