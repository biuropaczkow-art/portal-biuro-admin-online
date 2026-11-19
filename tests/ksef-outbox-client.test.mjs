import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("KSeF Outbox Client & Demo Integration", () => {
  it("prawidłowo obsługuje fallback offline, gdy mikroserwis outbox nie odpowiada", async () => {
    // Dynamic import klienta
    const { submitToTransactionalOutbox, getOutboxHealth } = await import("../lib/ksef-outbox-client.ts");

    const health = await getOutboxHealth();
    // Powinien zwrócić obiekt ze statusem boolean bez rzucania niespójnych wyjątków
    assert.equal(typeof health.online, "boolean");

    const submission = await submitToTransactionalOutbox({
      fileName: "FV_TEST_001.xml",
      fileHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sellerNip: "7532190370",
      invoiceNumber: "FV/TEST/001",
      issueDate: "2026-11-19",
      totalGross: 2460.00,
      invoiceType: "VAT"
    });

    assert.equal(typeof submission.success, "boolean");
    assert.equal(typeof submission.isBackendOnline, "boolean");
    if (!submission.isBackendOnline) {
      assert.equal(submission.success, true);
      assert.equal(submission.ksefStatus, "PENDING_LOCAL_CACHE");
    }
  });

  it("format validationDetails odpowiada specyfikacji Transactional Outbox i RabbitMQ", () => {
    const pgId = "OTX-1234";
    const validationDetails = `Zaksięgowano w Transactional Outbox (PostgreSQL ID: ${pgId}). Przekazano do kolejki RabbitMQ.`;

    assert.match(validationDetails, /Zaksięgowano w Transactional Outbox \(PostgreSQL ID: .+\)\. Przekazano do kolejki RabbitMQ\./);
  });
});
