"use client";

import React, { useState } from "react";
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
import { ShieldAlert, MailCheck, Clock, FileText, AlertTriangle } from "lucide-react";

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
}

const INITIAL_MOCK_ITEMS: EdoreczeniaItem[] = [
  {
    id: "EDO-2026-11-09-001",
    sender: "Urząd Skarbowy w Nysie",
    subject: "Zawiadomienie o zamiarze wszczęcia kontroli podatkowej",
    caseReference: "1608-SPV.410.12.2026",
    receivedAt: "2026-11-09T08:15:00Z",
    fictionDeadlineAt: "2026-11-23T23:59:59Z",
    status: "AWIZO_OCZEKUJE",
    proceduralDaysLimit: 7,
  },
  {
    id: "EDO-2026-11-04-042",
    sender: "ZUS Oddział w Opolu",
    subject: "Zawiadomienie o korekcie podstawy wymiaru składek ZUS DRA",
    caseReference: "ZUS-OP-2026-9812",
    receivedAt: "2026-11-04T10:00:00Z",
    fictionDeadlineAt: "2026-11-18T23:59:59Z",
    status: "ODEBRANE_UPD",
    updGeneratedAt: "2026-11-05T14:20:00Z",
    proceduralDaysLimit: 14,
  },
  {
    id: "EDO-2026-10-15-089",
    sender: "Sąd Rejonowy w Opolu, Wydział Gospodarczy",
    subject: "Zarządzenie sądu w sprawie wpisu zmian w KRS",
    caseReference: "OP.VIII.Ns-Rej.KRS/1420/26",
    receivedAt: "2026-10-15T09:00:00Z",
    fictionDeadlineAt: "2026-10-29T23:59:59Z",
    status: "FIKCJA_DORECZENIA",
    proceduralDaysLimit: 7,
  },
];

export function EdoreczeniaPanel() {
  const [items, setItems] = useState<EdoreczeniaItem[]>(INITIAL_MOCK_ITEMS);
  const [selectedForReceipt, setSelectedForReceipt] = useState<EdoreczeniaItem | null>(null);

  const handleConfirmReceipt = (item: EdoreczeniaItem) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: "ODEBRANE_UPD",
              updGeneratedAt: new Date().toISOString(),
            }
          : i
      )
    );
    setSelectedForReceipt(null);
  };

  const calculateDaysRemaining = (deadlineIso: string): number => {
    const diff = new Date(deadlineIso).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
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
          rozpoczyna bieg urzędowych terminów procesowych. W przypadku braku
          manualnego odbioru pismo zostanie uznane za doręczone z upływem 14 dni
          od dnia wpływu (fikcja doręczenia).
        </AlertDescription>
      </Alert>

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
                    {item.status === "ODEBRANE_UPD" && item.updGeneratedAt && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        UPD potwierdzone: {new Date(item.updGeneratedAt).toLocaleString("pl-PL")}.
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
                              {item.proceduralDaysLimit ?? 14} dni).
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSelectedForReceipt(null)}>
                            Anuluj
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleConfirmReceipt(item)}
                            className="bg-primary text-primary-foreground"
                          >
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
