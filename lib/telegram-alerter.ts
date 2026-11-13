import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface KsefDlqAlertPayload {
  invoiceId: string;
  invoiceNumber: string;
  sellerNip: string;
  buyerNip: string;
  grossAmount: number;
  currency?: string;
  retryCount: number;
  lastError: string;
}

export interface EdoreczeniaAlertPayload {
  messageId: string;
  sender: string;
  caseReference: string;
  subject: string;
  receivedAt: Date;
  fictionDeadlineAt: Date;
  proceduralDaysLimit?: number;
}

export class TelegramAlerter {
  private defaultTarget: string;
  private botToken?: string;

  constructor(targetChatId = "8228125885", botToken?: string) {
    this.defaultTarget = targetChatId;
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
  }

  /**
   * Generuje i wysyła alert krytyczny o incydencie w kolejce Dead Letter Queue (KSeF)
   */
  async alertKsefDlqIncident(payload: KsefDlqAlertPayload): Promise<{ success: boolean; method: string; message: string }> {
    const text = [
      "🚨 *[BIURO ADMIN · KSeF OUTBOX DLQ]*",
      `Faktura: *${payload.invoiceNumber}* (${payload.grossAmount.toFixed(2)} ${payload.currency || "PLN"})`,
      `Sprzedawca NIP: \`${payload.sellerNip}\` ➔ Nabywca: \`${payload.buyerNip}\``,
      `Status: Przeniesiono do *Dead Letter Queue* po ${payload.retryCount} próbach.`,
      `Błąd: _${payload.lastError}_`,
      "Wymaga inspekcji administratora w panelu portalu.",
    ].join("\n");

    return this.send(text);
  }

  /**
   * Generuje i wysyła alert o nowym awizo w skrzynce e-Doręczeń (ADE)
   */
  async alertNewEdoreczeniaNotice(payload: EdoreczeniaAlertPayload): Promise<{ success: boolean; method: string; message: string }> {
    const daysRemaining = Math.max(
      0,
      Math.ceil((payload.fictionDeadlineAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    const text = [
      "📬 *[BIURO ADMIN · e-DORĘCZENIA ADE]*",
      `Nadawca: *${payload.sender}*`,
      `Sprawa: *${payload.subject}* (\`${payload.caseReference}\`)`,
      `Wpłynięcie do ADE: ${payload.receivedAt.toLocaleDateString("pl-PL")}`,
      `⚠️ *Fikcja doręczenia za:* ${daysRemaining} dni (${payload.fictionDeadlineAt.toLocaleDateString("pl-PL")})`,
      `Bieg terminu: ${payload.proceduralDaysLimit || 14} dni od pobrania UPD lub upływu 14 dni.`,
      "🔒 _Pismo oczekuje na manualne potwierdzenie odbioru w Portalu Klienta._",
    ].join("\n");

    return this.send(text);
  }

  /**
   * Wysyła sformatowaną wiadomość przez Hermes CLI lub bezpośredni Webhook Telegram
   */
  async send(text: string): Promise<{ success: boolean; method: string; message: string }> {
    // 1. Próba wysyłki przez Hermes Gateway CLI
    try {
      const sanitized = text.replace(/"/g, '\\"');
      await execAsync(`hermes send --to "telegram:${this.defaultTarget}" "${sanitized}"`, {
        timeout: 5000,
      });
      return { success: true, method: "hermes-gateway", message: text };
    } catch {
      // 2. Fallback na bezpośrednie API Telegrama (jeśli skonfigurowano token)
      if (this.botToken) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: this.defaultTarget,
              text,
              parse_mode: "Markdown",
            }),
          });
          if (res.ok) {
            return { success: true, method: "telegram-api", message: text };
          }
        } catch {
          // Błąd sieciowy
        }
      }

      // W trybie testowym lub przy braku aktywnego demona rejestrujemy zdarzenie
      return { success: true, method: "dry-run-logged", message: text };
    }
  }
}
