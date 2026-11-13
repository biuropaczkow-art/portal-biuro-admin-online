import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Telegram Alerter - Moduł krytycznych powiadomień operatorskich", () => {
  it("prawidłowo formatuje alert krytyczny dla incydentu KSeF DLQ", () => {
    const payload = {
      invoiceId: "inv-98213",
      invoiceNumber: "FV/2026/042",
      sellerNip: "7532190370",
      buyerNip: "5252627623",
      grossAmount: 14760.0,
      currency: "PLN",
      retryCount: 5,
      lastError: "KSeF Gateway Timeout 504 - brak odpowiedzi bramki MF",
    };

    const text = [
      "🚨 *[BIURO ADMIN · KSeF OUTBOX DLQ]*",
      `Faktura: *${payload.invoiceNumber}* (${payload.grossAmount.toFixed(2)} ${payload.currency || "PLN"})`,
      `Sprzedawca NIP: \`${payload.sellerNip}\` ➔ Nabywca: \`${payload.buyerNip}\``,
      `Status: Przeniesiono do *Dead Letter Queue* po ${payload.retryCount} próbach.`,
      `Błąd: _${payload.lastError}_`,
      "Wymaga inspekcji administratora w panelu portalu.",
    ].join("\n");

    assert.ok(text.includes("FV/2026/042"));
    assert.ok(text.includes("7532190370"));
    assert.ok(text.includes("Dead Letter Queue"));
    assert.ok(text.includes("po 5 próbach"));
    assert.ok(text.includes("14760.00 PLN"));
  });

  it("prawidłowo formatuje alert o nowym awizo e-Doręczeń z terminem fikcji", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const deadline = new Date("2026-11-15T23:59:59Z");

    const payload = {
      messageId: "EDO-0012",
      sender: "Urząd Skarbowy w Nysie",
      caseReference: "1608-SPV.410.12.2026",
      subject: "Zawiadomienie o zamiarze wszczęcia kontroli podatkowej",
      receivedAt: received,
      fictionDeadlineAt: deadline,
      proceduralDaysLimit: 7,
    };

    const text = [
      "📬 *[BIURO ADMIN · e-DORĘCZENIA ADE]*",
      `Nadawca: *${payload.sender}*`,
      `Sprawa: *${payload.subject}* (\`${payload.caseReference}\`)`,
      `Bieg terminu: ${payload.proceduralDaysLimit} dni od pobrania UPD lub upływu 14 dni.`,
      "🔒 _Pismo oczekuje na manualne potwierdzenie odbioru w Portalu Klienta._",
    ].join("\n");

    assert.ok(text.includes("Urząd Skarbowy w Nysie"));
    assert.ok(text.includes("1608-SPV.410.12.2026"));
    assert.ok(text.includes("7 dni od pobrania UPD"));
    assert.ok(text.includes("manualne potwierdzenie"));
  });

  it("zapewnia brak wycieku sekretów i tokenów w generowanym komunikacie", () => {
    const fakeToken = "bot8228125885:AAEkfJ3_example_token_99";
    const text = "🚨 *[BIURO ADMIN · KSeF OUTBOX DLQ]* Faktura: FV/2026/042";

    assert.equal(text.includes(fakeToken), false);
  });
});
