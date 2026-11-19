import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("ChatGPT Actions & OpenAPI 3.1.0 Specification (W-05)", () => {
  const rootDir = path.resolve(import.meta.dirname, "..");
  const publicPath = path.resolve(rootDir, "public/chatgpt-openapi.json");
  const deployPath = path.resolve(rootDir, "deploy/vps/site/chatgpt-openapi.json");

  it("pliki specyfikacji OpenAPI istnieją w katalogach public/ oraz deploy/vps/site/", () => {
    assert.ok(fs.existsSync(publicPath), "public/chatgpt-openapi.json powinien istnieć");
    assert.ok(fs.existsSync(deployPath), "deploy/vps/site/chatgpt-openapi.json powinien istnieć");
  });

  it("pliki są poprawnym formatem JSON i są ze sobą zgodne", () => {
    const publicContent = fs.readFileSync(publicPath, "utf-8");
    const deployContent = fs.readFileSync(deployPath, "utf-8");

    const publicSpec = JSON.parse(publicContent);
    const deploySpec = JSON.parse(deployContent);

    assert.equal(publicSpec.openapi, "3.1.0");
    assert.equal(deploySpec.openapi, "3.1.0");
    assert.deepEqual(publicSpec.servers, deploySpec.servers);
    assert.deepEqual(Object.keys(publicSpec.paths), Object.keys(deploySpec.paths));
  });

  it("specyfikacja definiuje poprawny serwer i schemat uwierzytelniania x-api-key", () => {
    const spec = JSON.parse(fs.readFileSync(publicPath, "utf-8"));

    assert.equal(spec.servers?.[0]?.url, "https://portal.biuroadmin.online/api/ksef");
    
    const securityScheme = spec.components?.securitySchemes?.ApiKeyAuth;
    assert.ok(securityScheme, "Brak zdefiniowanego securitySchemes.ApiKeyAuth");
    assert.equal(securityScheme.type, "apiKey");
    assert.equal(securityScheme.in, "header");
    assert.equal(securityScheme.name, "x-api-key");
  });

  it("specyfikacja zawiera wymagane trasy integracji z KSeF, Outbox i e-Doręczeniami", () => {
    const spec = JSON.parse(fs.readFileSync(publicPath, "utf-8"));
    const paths = spec.paths;

    assert.ok(paths["/api/outbox/stats"], "Brak trasy /api/outbox/stats");
    assert.ok(paths["/api/outbox/stats"].get, "Brak metody GET dla /api/outbox/stats");

    assert.ok(paths["/api/invoices"], "Brak trasy /api/invoices");
    assert.ok(paths["/api/invoices"].post, "Brak metody POST dla /api/invoices");
    assert.ok(paths["/api/invoices"].get, "Brak metody GET dla /api/invoices");

    assert.ok(paths["/api/edoreczenia/messages"], "Brak trasy /api/edoreczenia/messages");
    assert.ok(paths["/api/edoreczenia/messages"].get, "Brak metody GET dla /api/edoreczenia/messages");
  });
});