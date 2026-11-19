"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldAlert,
  ShieldCheck,
  MailCheck,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  EdoreczeniaItem,
  EdoreczeniaStatus,
  fetchEdoreczeniaMessages,
  signEdoreczeniaUpd,
} from "@/lib/edoreczenia-client";

export type { EdoreczeniaStatus, EdoreczeniaItem };

export function EdoreczeniaPanel() {
  const [items, setItems] = useState<EdoreczeniaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [selectedForReceipt, setSelectedForReceipt] = useState<EdoreczeniaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMessages = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchEdoreczeniaMessages();
      setItems(data);
      setIsBackendOnline(Boolean(data.isBackendOnline));
    } catch (err: any) {
      console.error("Błąd pobierania pism ADE:", err);
      setErrorMessage("Nie udało się pobrać listy pism ADE.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleConfirmReceipt = async (item: EdoreczeniaItem) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await signEdoreczeniaUpd(item.id, "Jarosław Konik (Doradca Podatkowy)");
      if (result.success && result.message) {
        const updatedMsg = result.message;
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id || i.id === updatedMsg.id
              ? {
                  ...i,
                  ...updatedMsg,
                  status: "ODEBRANE_UPD",
                  updGeneratedAt: updatedMsg.updGeneratedAt || updatedMsg.updSignedAt || new Date().toISOString(),
                }
              : i
          )
        );
      } else {
        setErrorMessage(result.error || "Wystąpił błąd podczas wystawiania UPD.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Błąd komunikacji z modułem e-Doręczeń.");
    } finally {
      setIsSubmitting(false);
      setSelectedForReceipt(null);
    }
  };

  const calculateDaysRemaining = (deadlineIso: string): number => {
    const diff = new Date(deadlineIso).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      {/* Pasek statusu bezpieczeństwa i połączenia mTLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 border border-border rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-600/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-medium"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Certyfikat mTLS ADE Aktywny (QWAC)
          </Badge>
          {isBackendOnline ? (
            <Badge
              variant="outline"
              className="border-blue-600/50 bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-medium"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Mikroserwis ADE Online (:3001)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-muted text-muted-foreground flex items-center gap-1.5"
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
              Tryb Lokalny / Offline Fallback
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden sm:inline">
            Protokół: <strong>e-Doręczenia v2.1 (Gov.pl)</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMessages}
            disabled={isLoading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Alert bezpieczeństwa procesowego */}
      <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-base">
          Zasada Safety-First (Zakaz automatycznego generowania UPD)
        </AlertTitle>
        <AlertDescription className="text-sm mt-1 leading-relaxed">
          Zgodnie z art. 41 i 42 Ustawy o doręczeniach elektronicznych, portal
          <strong> nie pobiera pism automatycznie</strong>. Odebranie pisma i
          wystawienie Urzędowego Poświadczenia Doręczenia (UPD) natychmiast
          rozpoczyna bieg urzędowych terminów procesowych (7 dni na zażalenie lub 14 dni na odwołanie).
          W przypadku braku manualnego odbioru pismo zostanie uznane za doręczone z upływem 14 dni
          od dnia wpływu (fikcja doręczenia).
        </AlertDescription>
      </Alert>

      {/* Komunikat błędu operacji */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Błąd modułu e-Doręczeń</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stan ładowania */}
      {isLoading && items.length === 0 && (
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Ładowanie korespondencji z bufora ADE...
        </div>
      )}

      {/* Lista przesyłek urzędowych */}
      <div className="grid gap-4">
        {items.map((item) => {
          const daysToFiction = calculateDaysRemaining(item.fictionDeadlineAt);

          return (
            <Card key={item.id} className="relative overflow-hidden border border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      {item.sender}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      ({item.caseReference})
                    </span>
                  </div>

                  <div>
                    {item.status === "AWIZO_OCZEKUJE" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Awizo oczekuje na odbiór
                      </Badge>
                    )}
                    {item.status === "ODEBRANE_UPD" && (
                      <Badge variant="default" className="bg-emerald-600 text-white flex items-center gap-1">
                        <MailCheck className="h-3 w-3" />
                        Odebrano (UPD wystawione)
                      </Badge>
                    )}
                    {item.status === "FIKCJA_DORECZENIA" && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Fikcja doręczenia (14 dni minęło)
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm text-foreground/90 font-medium mt-1">
                  {item.subject}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md">
                  <div>
                    <span className="font-semibold text-foreground">Wpłynięcie do ADE:</span>{" "}
                    {new Date(item.receivedAt).toLocaleString("pl-PL")}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Koniec terminu 14 dni:</span>{" "}
                    {new Date(item.fictionDeadlineAt).toLocaleDateString("pl-PL")}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Bieg procesowy:</span>{" "}
                    {item.proceduralDaysLimit ? `${item.proceduralDaysLimit} dni od UPD/fikcji` : "zależny od pisma"}
                  </div>
                </div>

                {/* Sekcja akcji w zależności od stanu */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="text-xs">
                    {item.status === "AWIZO_OCZEKUJE" && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Pozostało {daysToFiction} dni do fikcji doręczenia.
                      </span>
                    )}
                    {item.status === "ODEBRANE_UPD" && (item.updGeneratedAt || item.updSignedAt) && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        UPD potwierdzone: {new Date(item.updGeneratedAt || item.updSignedAt!).toLocaleString("pl-PL")}.
                        {item.signedBy ? ` Podpis: ${item.signedBy}` : ""}
                      </span>
                    )}
                    {item.status === "FIKCJA_DORECZENIA" && (
                      <span className="text-destructive font-medium">
                        Termin urzędowy biegnie od daty fikcji doręczenia.
                      </span>
                    )}
                  </div>

                  {item.status === "AWIZO_OCZEKUJE" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setSelectedForReceipt(item)}
                          disabled={isSubmitting}
                        >
                          Pobierz treść i wygeneruj UPD
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Potwierdzenie prawnego odbioru pisma
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2 text-sm">
                            <p>
                              Czy na pewno chcesz pobrać pismo od:
                              <strong> {item.sender}</strong>?
                            </p>
                            <p className="text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                              Pobranie pliku spowoduje natychmiastowe wystawienie
                              <strong> Urzędowego Poświadczenia Doręczenia (UPD)</strong> i rozpocznie bieg terminu procesowego (
                              {item.proceduralDaysLimit ?? 14} dni na odpowiedź / zaskarżenie).
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => setSelectedForReceipt(null)}
                            disabled={isSubmitting}
                          >
                            Anuluj
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleConfirmReceipt(item)}
                            disabled={isSubmitting}
                            className="bg-primary text-primary-foreground flex items-center gap-2"
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Potwierdzam odbiór i start terminu
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {item.status === "ODEBRANE_UPD" && (
                    <Button variant="outline" size="sm">
                      Pobierz pismo i UPD (.xml / .pdf)
                    </Button>
                  )}

                  {item.status === "FIKCJA_DORECZENIA" && (
                    <Button variant="secondary" size="sm">
                      Pobierz pismo po upływie 14 dni
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
