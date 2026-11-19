"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Check,
  ShieldAlert,
  Sparkles,
  Terminal,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  Lock,
  BookOpen,
} from "lucide-react";
import {
  ApiKeyItem,
  CreateApiKeyResult,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/auth-client";

// Domyślne klucze demonstracyjne w przypadku braku połączenia z backendem (tryb offline / preview)
const DEMO_SEEDS: ApiKeyItem[] = [
  {
    id: "key-seed-01",
    name: "Mój Asystent ChatGPT (GPT-4o)",
    keyPrefix: "ba_live_7d9e...",
    scopes: ["invoices:read", "ksef:status", "edoreczenia:read"],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "key-seed-02",
    name: "KSeF Inwentaryzacja & Outbox Bot",
    keyPrefix: "ba_live_a1b2...",
    scopes: ["invoices:read", "invoices:write", "ksef:status"],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const AVAILABLE_SCOPES = [
  {
    id: "invoices:read",
    label: "Faktury: Odczyt",
    description: "Pobieranie faktur, sprawdzanie statusów UPO i KSeF",
  },
  {
    id: "invoices:write",
    label: "Faktury: Zapis",
    description: "Rejestracja nowej faktury z antyduplikacją SHA-256",
  },
  {
    id: "ksef:status",
    label: "KSeF: Status",
    description: "Monitoring kolejki Outbox i bufora transakcyjnego",
  },
  {
    id: "edoreczenia:read",
    label: "e-Doręczenia: Odczyt",
    description: "Pobieranie pism urzędowych ADE i terminów zawitych",
  },
];

const CHATGPT_SYSTEM_PROMPT = `Jesteś certyfikowanym asystentem księgowym i doradcą podatkowym zintegrowanym z Portalem BiuroAdmin (KSeF 2.0, FA(3), e-Doręczenia ADE, Transactional Outbox).

Twoje możliwości:
1. Odpytywanie o stan kolejki asynchronicznej KSeF (bufor Transactional Outbox) przez GET /api/outbox/stats.
2. Rejestracja i walidacja faktur VAT z zabezpieczeniem przed podwójnym zaksięgowaniem (deduplikacja SHA-256) przez POST /api/invoices.
3. Pobieranie listy faktur oraz sprawdzanie statusów UPO i numerów KSeF przez GET /api/invoices.
4. Monitoring pism urzędowych ze skrzynki e-Doręczeń (ADE) i pilnowanie 14-dniowej fikcji doręczenia przez GET /api/edoreczenia/messages.

Zasady działania:
- Zawsze weryfikuj NIP kontrahenta przed zgłoszeniem faktury.
- Informuj użytkownika o zbliżających się terminach procesowych e-Doręczeń.
- Działaj zgodnie z polskim prawem podatkowym i standardami bezpieczeństwa Biura Rachunkowego Jarosław Konik.`;

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal tworzenia nowego klucza
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [keyName, setKeyName] = useState<string>("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "invoices:read",
    "ksef:status",
    "edoreczenia:read",
  ]);
  const [expiresInDays, setExpiresInDays] = useState<number>(90);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal wyświetlenia wygenerowanego surowego klucza
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [generatedKeyItem, setGeneratedKeyItem] = useState<ApiKeyItem | null>(null);
  const [isRawKeyModalOpen, setIsRawKeyModalOpen] = useState<boolean>(false);
  const [hasCopiedRawKey, setHasCopiedRawKey] = useState<boolean>(false);

  // Potwierdzenie unieważnienia klucza
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [isRevokeAlertOpen, setIsRevokeAlertOpen] = useState<boolean>(false);

  // Sekcja instrukcji Custom GPT
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState<boolean>(false);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState<boolean>(false);

  const fetchKeys = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await listApiKeys();
      if (res.success && res.apiKeys && res.apiKeys.length > 0) {
        setKeys(res.apiKeys);
        setIsBackendConnected(true);
      } else if (res.success && res.apiKeys) {
        // Backend odpowiedział pustą listą
        setKeys(res.apiKeys);
        setIsBackendConnected(true);
      } else {
        // Fallback do localStorage lub DEMO_SEEDS
        loadFallbackKeys();
      }
    } catch {
      loadFallbackKeys();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackKeys = () => {
    setIsBackendConnected(false);
    try {
      const saved = localStorage.getItem("biuroadmin_mock_api_keys");
      if (saved) {
        setKeys(JSON.parse(saved));
      } else {
        setKeys(DEMO_SEEDS);
      }
    } catch {
      setKeys(DEMO_SEEDS);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((id) => id !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setErrorMessage("Wprowadź nazwę klucza API.");
      return;
    }
    if (selectedScopes.length === 0) {
      setErrorMessage("Wybierz co najmniej jedno uprawnienie.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res: CreateApiKeyResult = await generateApiKey({
        name: keyName.trim(),
        scopes: selectedScopes,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
      });

      if (res.success && res.rawKey && res.apiKey) {
        setKeys((prev) => [res.apiKey!, ...prev]);
        setGeneratedRawKey(res.rawKey);
        setGeneratedKeyItem(res.apiKey);
        setIsCreateOpen(false);
        setIsRawKeyModalOpen(true);
        resetForm();
      } else {
        // Fallback symulacyjny w środowisku demo/offline
        const mockRawKey = `ba_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
        const mockItem: ApiKeyItem = {
          id: `key-${Date.now()}`,
          name: keyName.trim(),
          keyPrefix: `${mockRawKey.substring(0, 12)}...`,
          scopes: selectedScopes,
          createdAt: new Date().toISOString(),
          expiresAt: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined,
        };

        const updated = [mockItem, ...keys];
        setKeys(updated);
        try {
          localStorage.setItem("biuroadmin_mock_api_keys", JSON.stringify(updated));
        } catch {}

        setGeneratedRawKey(mockRawKey);
        setGeneratedKeyItem(mockItem);
        setIsCreateOpen(false);
        setIsRawKeyModalOpen(true);
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Błąd podczas generowania klucza API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setKeyName("");
    setSelectedScopes(["invoices:read", "ksef:status", "edoreczenia:read"]);
    setExpiresInDays(90);
  };

  const handleConfirmRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      const res = await revokeApiKey(keyToRevoke.id);
      const updated = keys.map((k) =>
        k.id === keyToRevoke.id
          ? { ...k, revokedAt: new Date().toISOString() }
          : k
      );
      setKeys(updated);
      try {
        localStorage.setItem("biuroadmin_mock_api_keys", JSON.stringify(updated));
      } catch {}
    } catch {
      const updated = keys.map((k) =>
        k.id === keyToRevoke.id
          ? { ...k, revokedAt: new Date().toISOString() }
          : k
      );
      setKeys(updated);
    } finally {
      setIsRevokeAlertOpen(false);
      setKeyToRevoke(null);
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback kopiowania
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Nigdy";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek panelu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Key className="h-6 w-6 text-primary" />
              Klucze API & ChatGPT Actions
            </h2>
            {isBackendConnected ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                API KSeF Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 gap-1">
                <Clock className="h-3 w-3" />
                Tryb symulacyjny (Demo)
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Zarządzaj kluczami dostępowymi dla asystentów AI (Custom GPT / ChatGPT Actions) oraz zewnętrznych systemów ERP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKeys}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Wygeneruj nowy klucz dla ChatGPT Actions
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Komunikat</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Tabela kluczy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Aktywne i zarejestrowane klucze dostępowe
          </CardTitle>
          <CardDescription>
            Klucze z prefiksem <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ba_live_</code> są hashowane bezpiecznym algorytmem w bazie PostgreSQL.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nazwa klucza</TableHead>
                <TableHead>Prefix / Identyfikator</TableHead>
                <TableHead>Uprawnienia (Scopes)</TableHead>
                <TableHead>Utworzono</TableHead>
                <TableHead>Ostatnie użycie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Wczytywanie listy kluczy API...
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Brak aktywnych kluczy API. Kliknij „Wygeneruj nowy klucz dla ChatGPT Actions”, aby utworzyć pierwszy token integracji.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((item) => {
                  const isRevoked = Boolean(item.revokedAt);
                  const isExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;

                  return (
                    <TableRow key={item.id} className={isRevoked ? "opacity-60 bg-muted/30" : ""}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div>{item.name}</div>
                          {item.expiresAt && !isRevoked && (
                            <div className="text-xs text-muted-foreground">
                              Ważny do: {new Date(item.expiresAt).toLocaleDateString("pl-PL")}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono border">
                          {item.keyPrefix}
                        </code>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {item.scopes.map((sc) => (
                            <Badge
                              key={sc}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-mono"
                            >
                              {sc}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.lastUsedAt)}
                      </TableCell>

                      <TableCell>
                        {isRevoked ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <ShieldAlert className="h-3 w-3" />
                            Odwołany
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Wygasł
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-xs">
                            <ShieldCheck className="h-3 w-3" />
                            Aktywny
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {!isRevoked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                            onClick={() => {
                              setKeyToRevoke(item);
                              setIsRevokeAlertOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Odwołaj
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rozwijana sekcja: Instrukcja podłączenia w ChatGPT */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader
          className="cursor-pointer bg-muted/40 hover:bg-muted/60 transition-colors py-4 px-6 flex flex-row items-center justify-between"
          onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Instrukcja podłączenia w ChatGPT (Custom GPT / Actions)
                <Badge variant="secondary" className="text-xs font-normal">
                  OpenAPI 3.1.0
                </Badge>
              </CardTitle>
              <CardDescription>
                Skonfiguruj integrację krok po kroku w OpenAI GPT Builderze.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1">
            {isInstructionsOpen ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </CardHeader>

        {isInstructionsOpen && (
          <CardContent className="pt-6 space-y-6 text-sm">
            {/* Krok 1 */}
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                Import schematu OpenAPI (Schema URL)
              </div>
              <p className="text-muted-foreground text-xs pl-8">
                W panelu konfiguracji Custom GPT (zakładka <strong>Actions</strong>) kliknij <em>Import from URL</em> i wklej oficjalny adres schematu:
              </p>
              <div className="pl-8 flex items-center gap-2">
                <Input
                  readOnly
                  value="https://portal.biuroadmin.online/chatgpt-openapi.json"
                  className="font-mono text-xs bg-muted/50 max-w-lg"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      "https://portal.biuroadmin.online/chatgpt-openapi.json",
                      setHasCopiedUrl
                    )
                  }
                  className="gap-1.5"
                >
                  {hasCopiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Skopiowano
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Kopiuj URL
                    </>
                  )}
                </Button>
                <a
                  href="/chatgpt-openapi.json"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Otwórz JSON <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Krok 2 */}
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Uwierzytelnienie API (Authentication)
              </div>
              <p className="text-muted-foreground text-xs pl-8">
                W sekcji <strong>Authentication</strong> wybierz poniższe parametry:
              </p>
              <div className="pl-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-card">
                  <div className="text-xs text-muted-foreground font-medium">Authentication Type</div>
                  <div className="font-mono text-sm font-semibold mt-1">API Key</div>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <div className="text-xs text-muted-foreground font-medium">Auth Type / Header Name</div>
                  <div className="font-mono text-sm font-semibold mt-1">Custom / x-api-key</div>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <div className="text-xs text-muted-foreground font-medium">Wartość klucza (Key)</div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">Twój wygenerowany ba_live_...</div>
                </div>
              </div>
            </div>

            {/* Krok 3 */}
            <div className="space-y-2">
              <div className="font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </span>
                  Rekomendowany System Prompt dla Asystenta Księgowego
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(CHATGPT_SYSTEM_PROMPT, setHasCopiedPrompt)}
                  className="gap-1.5 h-8 text-xs"
                >
                  {hasCopiedPrompt ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Skopiowano prompt
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Kopiuj prompt systemowy
                    </>
                  )}
                </Button>
              </div>
              <div className="pl-8">
                <pre className="p-4 rounded-lg bg-muted text-xs font-mono whitespace-pre-wrap text-muted-foreground border leading-relaxed">
                  {CHATGPT_SYSTEM_PROMPT}
                </pre>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Modal generowania nowego klucza */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateKey}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Generowanie klucza API dla ChatGPT
              </DialogTitle>
              <DialogDescription>
                Utwórz dedykowany klucz API z ograniczonymi uprawnieniami do integracji z asystentem AI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nazwa klucza / Identyfikator asystenta <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="np. Mój Asystent ChatGPT, Inwentaryzacja KSeF"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Uprawnienia dostępowe (Scopes) <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  {AVAILABLE_SCOPES.map((scope) => {
                    const isChecked = selectedScopes.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        className="flex items-start space-x-3 p-1.5 rounded hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => handleToggleScope(scope.id)}
                      >
                        <Checkbox
                          id={scope.id}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleScope(scope.id)}
                          className="mt-0.5"
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor={scope.id}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            {scope.label}
                          </label>
                          <p className="text-[11px] text-muted-foreground">
                            {scope.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Okres ważności klucza</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                >
                  <option value={30}>30 dni</option>
                  <option value={90}>90 dni (rekomendowane)</option>
                  <option value={180}>180 dni</option>
                  <option value={365}>1 rok</option>
                  <option value={0}>Bezterminowy</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generowanie...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Wygeneruj klucz
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal / Banner po wygenerowaniu klucza z ostrzeżeniem bezpieczeństwa */}
      <Dialog open={isRawKeyModalOpen} onOpenChange={setIsRawKeyModalOpen}>
        <DialogContent className="sm:max-w-lg border-amber-400/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              Klucz API został pomyślnie wygenerowany!
            </DialogTitle>
            <DialogDescription>
              Klucz: <strong>{generatedKeyItem?.name}</strong> został zarejestrowany.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
                Ważne ostrzeżenie bezpieczeństwa
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Skopiuj klucz teraz. Ze względów bezpieczeństwa nie będzie można go ponownie wyświetlić. W bazie przechowywany jest wyłącznie kryptograficzny skrót (hash).
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Twój tajny klucz API (skopiuj do Custom GPT)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedRawKey || ""}
                  className="font-mono text-sm bg-muted select-all border-primary/50 text-primary font-bold"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(generatedRawKey || "", setHasCopiedRawKey)
                  }
                  className="gap-1.5 shrink-0 bg-primary"
                >
                  {hasCopiedRawKey ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-300" />
                      Skopiowano!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Kopiuj klucz
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
              <div className="font-medium text-foreground mb-1">Przypomnienie:</div>
              W konfiguracji Custom GPT wprowadź nagłówek <code>x-api-key</code> oraz wklej powyższą wartość.
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              variant="default"
              onClick={() => {
                setIsRawKeyModalOpen(false);
                setGeneratedRawKey(null);
                setGeneratedKeyItem(null);
              }}
            >
              Zapisałem klucz w bezpiecznym miejscu, zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog potwierdzenia odwołania klucza */}
      <AlertDialog open={isRevokeAlertOpen} onOpenChange={setIsRevokeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Czy na pewno chcesz odwołać ten klucz API?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Odwołanie klucza <strong>{keyToRevoke?.name}</strong> spowoduje natychmiastowe zablokowanie wszystkich zapytań wysyłanych przez przypisanego asystenta ChatGPT Actions. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKeyToRevoke(null)}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Odwołaj klucz bezpowrotnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}