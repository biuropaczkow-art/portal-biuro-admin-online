import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("Auth Client & RBAC Session Integration (W-04)", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  it("zwraca poprawny bazowy adres API w środowisku serwerowym", async () => {
    const { getAuthApiBaseUrl } = await import("../lib/auth-client.ts");
    const url = getAuthApiBaseUrl();
    assert.ok(url.includes("3001") || url.startsWith("/api/ksef"));
  });

  it("poprawnie loguje użytkownika i zapisuje token sesji", async () => {
    const { loginUser } = await import("../lib/auth-client.ts");

    const mockSession = {
      token: "test_session_token_123456",
      expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString()
    };
    const mockUser = {
      id: "usr_1",
      email: "admin@biuroadmin.online",
      name: "Jarosław Konik",
      role: "ADMIN",
      provider: "GOOGLE",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    global.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/auth/login"));
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.email, "admin@biuroadmin.online");
      assert.equal(body.provider, "GOOGLE");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          user: mockUser,
          session: mockSession
        })
      };
    };

    try {
      const result = await loginUser({
        provider: "GOOGLE",
        email: "admin@biuroadmin.online",
        name: "Jarosław Konik"
      });

      assert.equal(result.success, true);
      assert.equal(result.user?.role, "ADMIN");
      assert.equal(result.session?.token, mockSession.token);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("prawidłowo weryfikuje sesję użytkownika z nagłówkiem Authorization Bearer", async () => {
    const { getCurrentSession } = await import("../lib/auth-client.ts");

    global.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/auth/me"));
      assert.equal(options.method, "GET");
      assert.equal(options.headers["Authorization"], "Bearer my_valid_token");
      assert.equal(options.headers["x-session-token"], "my_valid_token");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          user: {
            id: "usr_client",
            email: "klient@firma.pl",
            name: "Klient Testowy",
            role: "CLIENT",
            provider: "CHATGPT",
            isActive: true
          }
        })
      };
    };

    try {
      const res = await getCurrentSession("my_valid_token");
      assert.equal(res.success, true);
      assert.equal(res.user?.email, "klient@firma.pl");
      assert.equal(res.user?.role, "CLIENT");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("prawidłowo kończy sesję użytkownika przez endpoint /api/auth/logout", async () => {
    const { logoutUser } = await import("../lib/auth-client.ts");

    let logoutCalled = false;
    global.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/auth/logout"));
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Authorization"], "Bearer session_to_kill");
      logoutCalled = true;

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, loggedOut: true })
      };
    };

    try {
      const res = await logoutUser("session_to_kill");
      assert.equal(res.success, true);
      assert.equal(logoutCalled, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("pobiera listę użytkowników RBAC dla administratora", async () => {
    const { listRegisteredUsers } = await import("../lib/auth-client.ts");

    global.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/auth/users"));
      assert.equal(options.method, "GET");
      assert.equal(options.headers["Authorization"], "Bearer admin_token");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          users: [
            { id: "1", email: "admin@biuroadmin.online", role: "ADMIN" },
            { id: "2", email: "klient@firma.pl", role: "CLIENT" }
          ]
        })
      };
    };

    try {
      const res = await listRegisteredUsers("admin_token");
      assert.equal(res.success, true);
      assert.equal(res.users?.length, 2);
      assert.equal(res.users?.[0].role, "ADMIN");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("generuje nowy klucz API dla integracji z ChatGPT Actions (W-05)", async () => {
    const { generateApiKey } = await import("../lib/auth-client.ts");

    global.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/auth/api-keys"));
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Authorization"], "Bearer my_token");
      const body = JSON.parse(options.body);
      assert.equal(body.name, "Mój Asystent ChatGPT");
      assert.deepEqual(body.scopes, ["invoices:read", "ksef:status"]);

      return {
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          rawKey: "ba_live_secret1234567890abcdef",
          apiKey: {
            id: "key_1",
            name: "Mój Asystent ChatGPT",
            keyPrefix: "ba_live_secr...",
            scopes: ["invoices:read", "ksef:status"],
            createdAt: new Date().toISOString()
          }
        })
      };
    };

    try {
      const res = await generateApiKey({
        name: "Mój Asystent ChatGPT",
        scopes: ["invoices:read", "ksef:status"],
      }, "my_token");

      assert.equal(res.success, true);
      assert.equal(res.rawKey, "ba_live_secret1234567890abcdef");
      assert.equal(res.apiKey?.name, "Mój Asystent ChatGPT");
      assert.equal(res.apiKey?.id, "key_1");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("pobiera listę kluczy API oraz obsługuje unieważnianie klucza (W-05)", async () => {
    const { listApiKeys, revokeApiKey } = await import("../lib/auth-client.ts");

    let listCalled = false;
    let revokeCalled = false;

    global.fetch = async (url, options) => {
      if (options.method === "GET" && url.endsWith("/api/auth/api-keys")) {
        listCalled = true;
        assert.equal(options.headers["Authorization"], "Bearer admin_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            apiKeys: [
              {
                id: "key_abc",
                name: "Audytor Finansowy",
                keyPrefix: "ba_live_aud1...",
                scopes: ["invoices:read"],
                createdAt: new Date().toISOString()
              }
            ]
          })
        };
      }

      if (options.method === "DELETE" && url.endsWith("/api/auth/api-keys/key_abc")) {
        revokeCalled = true;
        assert.equal(options.headers["Authorization"], "Bearer admin_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        };
      }

      throw new Error(`Unexpected call: ${options.method} ${url}`);
    };

    try {
      const listRes = await listApiKeys("admin_token");
      assert.equal(listRes.success, true);
      assert.equal(listRes.apiKeys?.length, 1);
      assert.equal(listRes.apiKeys?.[0].id, "key_abc");
      assert.equal(listCalled, true);

      const revokeRes = await revokeApiKey("key_abc", "admin_token");
      assert.equal(revokeRes.success, true);
      assert.equal(revokeCalled, true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
