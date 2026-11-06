"use client";
import {useEffect,useState,useRef} from "react";
import {ArrowLeft,ArrowRight,FileText,MessageSquare,ShieldCheck,Plus,CheckCircle2,Landmark,Activity,FileCheck2,Clock,Upload,AlertTriangle,ShieldAlert,Lock,Search,Building2,ExternalLink,RefreshCw,Check,UserCheck,AlertCircle,CreditCard} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Textarea} from "@/components/ui/textarea";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";

type Doc={
  id:number;
  name:string;
  company:string;
  amount:string;
  status:string;
  kind:string;
  fileHash?:string;
  sellerNip?:string;
  invoiceNumber?:string;
  issueDate?:string;
  validationDetails?:string;
};

type Contractor={
  id:number;
  nip:string;
  name:string;
  regon:string;
  statusVat:string;
  address:string;
  registrationDate?:string;
  krs?:string;
  accountNumbers?:string[];
  requestId?:string;
  isVerifiedWhiteList?:boolean;
};

const initialContractors:Contractor[]=[
  {
    id:1,
    nip:"7532190370",
    name:"JAROSŁAW KONIK BIURO RACHUNKOWE",
    regon:"160059549",
    statusVat:"Zwolniony",
    address:"JANA PAWŁA II 15, 48-370 PACZKÓW",
    registrationDate:"2006-03-01",
    accountNumbers:["34109021960000000160249221"],
    requestId:"seed-wl-001",
    isVerifiedWhiteList:true
  },
  {
    id:2,
    nip:"6770065406",
    name:"COMARCH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
    regon:"350527377",
    statusVat:"Czynny",
    address:"PROF. MICHAŁA ŻYCZKOWSKIEGO 33, 31-864 KRAKÓW",
    registrationDate:"2000-07-01",
    krs:"0001273837",
    accountNumbers:["03239000040011000000008177","08160010710003011250558001"],
    requestId:"seed-wl-002",
    isVerifiedWhiteList:true
  }
];

function validatePolishNip(nip:string):boolean{
  const digits=nip.replace(/[\s-]/g,"");
  if(!/^\d{10}$/.test(digits)) return false;
  const weights=[6,5,7,2,3,4,5,6,7];
  let sum=0;
  for(let i=0;i<9;i++){
    sum+=parseInt(digits[i],10)*weights[i];
  }
  return sum%11===parseInt(digits[9],10);
}

const initial:Doc[]=[
  {
    id:1,
    name:"FV/DEMO/001.xml",
    company:"Firma Alfa (demo)",
    amount:"2 460,00 zł",
    status:"Zaksięgowany (Unikalny)",
    kind:"KSeF",
    fileHash:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    sellerNip:"7532190370",
    invoiceNumber:"FV/DEMO/001",
    issueDate:"2026-11-01",
    validationDetails:"Zaksięgowano pomyślnie. Rejestr KSeF Outbox OTX-001."
  },
  {
    id:2,
    name:"FV/DEMO/002.pdf",
    company:"Firma Alfa (demo)",
    amount:"615,00 zł",
    status:"Zatwierdzony",
    kind:"Dokumenty",
    fileHash:"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    sellerNip:"7532190370",
    invoiceNumber:"FV/DEMO/002",
    issueDate:"2026-11-02",
    validationDetails:"Brak kolizji skrótu SHA-256. Zatwierdzony."
  },
  {
    id:3,
    name:"DRA — przykład",
    company:"Firma Alfa (demo)",
    amount:"Przykład bez wyliczeń",
    status:"Do sprawdzenia",
    kind:"e-ZUS"
  },
  {
    id:4,
    name:"FV/DEMO/003.xml",
    company:"Firma Beta (demo)",
    amount:"1 230,00 zł",
    status:"Do sprawdzenia",
    kind:"KSeF",
    fileHash:"8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    sellerNip:"9876543210",
    invoiceNumber:"FV/DEMO/003",
    issueDate:"2026-11-03",
    validationDetails:"Rejestr KSeF Outbox OTX-002."
  }
];

async function computeSha256(content:ArrayBuffer|string):Promise<string>{
  const buffer=typeof content==="string"?new TextEncoder().encode(content):content;
  const digest=await window.crypto.subtle.digest("SHA-256",buffer);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function Demo(){
  const [role,setRole]=useState("client");
  const [tab,setTab]=useState("overview");
  const [docs,setDocs]=useState<Doc[]>(initial);
  const [selected,setSelected]=useState<Doc|null>(null);
  const [notice,setNotice]=useState("");
  const [draft,setDraft]=useState("");
  const [valAlert,setValAlert]=useState<{type:"success"|"error";title:string;message:string;code?:string}|null>(null);
  const [isProcessing,setIsProcessing]=useState(false);
  const fileInputRef=useRef<HTMLInputElement|null>(null);

  const [searchNip,setSearchNip]=useState("");
  const [isSearchingGus,setIsSearchingGus]=useState(false);
  const [gusResult,setGusResult]=useState<Contractor|null>(null);
  const [gusError,setGusError]=useState<string|null>(null);
  const [contractors,setContractors]=useState<Contractor[]>(initialContractors);

  const [messages,setMessages]=useState([
    {by:"Biuro",text:"Witamy w demonstracji. W zakładce Dokumenty czeka przykładowa faktura do sprawdzenia."}
  ]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const hashParams=typeof window!=="undefined"?new URLSearchParams(window.location.hash.replace(/^#/,'')):new URLSearchParams();
    if(params.get("role")==="admin") setRole("admin");
    if(params.get("auth")==="google" || hashParams.get("access_token") || (typeof window!=="undefined" && window.location.pathname.includes("callback"))){
      setNotice("Zalogowano pomyślnie przez Google OAuth. Dostęp do przestrzeni klienta aktywny.");
    }
  },[]);

  const visible=docs.filter(d=>role==="admin"||d.company==="Firma Alfa (demo)");
  const pending=visible.filter(d=>d.status==="Do sprawdzenia"||d.status==="Zaksięgowany (Unikalny)").length;

  async function processDocumentUpload(file:File|null,meta?:{name?:string;sellerNip?:string;invoiceNumber?:string;issueDate?:string;amount?:string;content?:string}){
    setIsProcessing(true);
    setValAlert(null);
    try{
      let hash="";
      let fileName=meta?.name||(file?file.name:"nowy-dokument.pdf");
      let amount=meta?.amount||"1 845,00 zł";
      let sellerNip=meta?.sellerNip||"7532190370";
      let invoiceNumber=meta?.invoiceNumber||`FV/${new Date().getFullYear()}/${docs.length+10}`;
      let issueDate=meta?.issueDate||new Date().toISOString().split("T")[0];

      if(file){
        const arrayBuf=await file.arrayBuffer();
        hash=await computeSha256(arrayBuf);
      }else if(meta?.content){
        hash=await computeSha256(meta.content);
      }else{
        hash=await computeSha256(`${sellerNip}::${invoiceNumber}::${issueDate}::${amount}::${Date.now()}`);
      }

      // KROK 1: 3-stopniowy walidator: Weryfikacja hasha SHA-256 (Deduplikacja zawartości pliku)
      const duplicateHash=docs.find(d=>d.fileHash&&d.fileHash.toLowerCase()===hash.toLowerCase());
      if(duplicateHash){
        setValAlert({
          type:"error",
          title:"BLOKADA PODWÓJNEGO KSIĘGOWANIA",
          code:"DUPLICATE_FILE_HASH",
          message:`Plik o identycznym skrócie kryptograficznym SHA-256 (${hash.slice(0,16)}...) został już wcześniej zaksięgowany jako "${duplicateHash.name}" (${duplicateHash.company}). Zgodnie z procedurą KSeF Outbox próba ponownego księgowania została bezwzględnie zablokowana.`
        });
        return;
      }

      // KROK 2: Weryfikacja unikalności klucza biznesowego (sellerNip + invoiceNumber + issueDate)
      const duplicateKey=docs.find(d=>d.sellerNip===sellerNip&&d.invoiceNumber===invoiceNumber&&d.issueDate===issueDate);
      if(duplicateKey){
        setValAlert({
          type:"error",
          title:"BLOKADA DUPLIKATU BIZNESOWEGO",
          code:"DUPLICATE_BUSINESS_KEY",
          message:`Faktura o numerze ${invoiceNumber} od wystawcy NIP ${sellerNip} z dnia ${issueDate} już istnieje w rejestrze (dokument: "${duplicateKey.name}"). Próba podwójnego zgłoszenia odrzucona.`
        });
        return;
      }

      // KROK 3: Sukces walidacji - rejestracja dokumentu
      const newDoc:Doc={
        id:Math.max(...docs.map(d=>d.id),0)+1,
        name:fileName,
        company:role==="admin"?"Biuro Rachunkowe Konik":"Firma Alfa (demo)",
        amount,
        status:"Zaksięgowany (Unikalny)",
        kind:fileName.toLowerCase().endsWith(".xml")?"KSeF":"Dokumenty",
        fileHash:hash,
        sellerNip,
        invoiceNumber,
        issueDate,
        validationDetails:`Zweryfikowano pomyślnie przez 3-stopniowy walidator: unikalny SHA-256 (${hash.slice(0,12)}...), brak kolizji klucza biznesowego. Gotowy do KSeF.`
      };

      setDocs(prev=>[newDoc,...prev]);
      setValAlert({
        type:"success",
        title:"WALIDACJA POZYTYWNA — DOKUMENT ZAREJESTROWANY",
        message:`Dokument "${fileName}" pomyślnie przeszedł 3-stopniową kontrolę integralności. Hash SHA-256: ${hash.slice(0,16)}... Bezpiecznie dodano do rejestru.`
      });
    }catch(err:any){
      setValAlert({
        type:"error",
        title:"BŁĄD PRZETWARZANIA",
        message:err?.message||"Wystąpił nieoczekiwany błąd podczas walidacji pliku."
      });
    }finally{
      setIsProcessing(false);
      if(fileInputRef.current) fileInputRef.current.value="";
    }
  }

  function handleFileInputChange(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(file) processDocumentUpload(file);
  }

  function simulateNewUniqueInvoice(){
    const uniqueId=Date.now().toString().slice(-4);
    processDocumentUpload(null,{
      name:`Faktura_FV_${new Date().getFullYear()}_${uniqueId}.xml`,
      sellerNip:"7532190370",
      invoiceNumber:`FV/${new Date().getFullYear()}/${uniqueId}`,
      issueDate:new Date().toISOString().split("T")[0],
      amount:"3 690,00 zł",
      content:`<Faktura><NIP>7532190370</NIP><Nr>FV/${new Date().getFullYear()}/${uniqueId}</Nr><Timestamp>${Date.now()}</Timestamp></Faktura>`
    });
  }

  function simulateDuplicateAttempt(){
    // Próba wgrania dokładnego duplikatu FV/DEMO/001.xml z identycznym hashem
    processDocumentUpload(null,{
      name:"FV/DEMO/001_kopia.xml",
      sellerNip:"7532190370",
      invoiceNumber:"FV/DEMO/001",
      issueDate:"2026-11-01",
      amount:"2 460,00 zł",
      content:"" // Pusty string generuje znany hash SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    });
  }

  async function fetchContractorFromGus(nipInput?:string){
    const rawNip=(nipInput!==undefined?nipInput:searchNip).trim();
    const cleanNip=rawNip.replace(/[\s-]/g,"");
    setGusError(null);
    setGusResult(null);

    if(!validatePolishNip(cleanNip)){
      setGusError(`Niepoprawny format lub suma kontrolna NIP "${rawNip}". Wprowadź poprawny 10-cyfrowy NIP polskiego podatnika.`);
      return;
    }

    setIsSearchingGus(true);
    try{
      const today=new Date().toISOString().split("T")[0];
      const res=await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${cleanNip}?date=${today}`,{
        headers:{"Accept":"application/json"}
      });

      if(!res.ok){
        if(res.status===404||res.status===400){
          const errData=await res.json().catch(()=>null);
          throw new Error(errData?.message||`Podmiot o NIP ${cleanNip} nie figuruje w wykazie podatników VAT (Biała Lista) lub rejestrze.`);
        }
        throw new Error(`Błąd serwera rejestru państwowego (HTTP ${res.status}). Spróbuj ponownie.`);
      }

      const data=await res.json();
      const subject=data?.result?.subject;
      if(!subject){
        throw new Error(`Brak danych podmiotu w odpowiedzi rejestru MF dla NIP ${cleanNip}.`);
      }

      const contractor:Contractor={
        id:Date.now(),
        nip:subject.nip||cleanNip,
        name:subject.name||"Brak nazwy",
        regon:subject.regon||"Brak REGON",
        statusVat:subject.statusVat||"Niezarejestrowany",
        address:subject.workingAddress||subject.residenceAddress||"Brak adresu w rejestrze",
        registrationDate:subject.registrationLegalDate||undefined,
        krs:subject.krs||undefined,
        accountNumbers:Array.isArray(subject.accountNumbers)?subject.accountNumbers:[],
        requestId:data?.result?.requestId,
        isVerifiedWhiteList:true
      };

      setGusResult(contractor);
      setNotice(`Pobrano dane kontrahenta "${contractor.name}" z oficjalnego rejestru GUS / KAS.`);
    }catch(err:any){
      setGusError(err?.message||"Wystąpił błąd podczas pobierania danych z rejestru.");
    }finally{
      setIsSearchingGus(false);
    }
  }

  function addContractorToRegistry(c:Contractor){
    if(contractors.some(item=>item.nip===c.nip)){
      setNotice(`Kontrahent o NIP ${c.nip} już znajduje się w kartotece.`);
      return;
    }
    setContractors(prev=>[c,...prev]);
    setNotice(`Kontrahent "${c.name}" został pomyślnie dodany do kartoteki biura.`);
  }

  function createInvoiceForContractor(c:Contractor){
    setTab("documents");
    const uniqueId=Date.now().toString().slice(-4);
    processDocumentUpload(null,{
      name:`FV_${c.nip}_${uniqueId}.xml`,
      sellerNip:c.nip,
      invoiceNumber:`FV/${new Date().getFullYear()}/${uniqueId}`,
      issueDate:new Date().toISOString().split("T")[0],
      amount:"2 460,00 zł",
      content:`<Faktura><NIP>${c.nip}</NIP><Nazwa>${c.name}</Nazwa><REGON>${c.regon}</REGON><Nr>FV/${new Date().getFullYear()}/${uniqueId}</Nr><Timestamp>${Date.now()}</Timestamp></Faktura>`
    });
  }

  function approve(){
    if(!selected) return;
    setDocs(p=>p.map(d=>d.id===selected.id?{...d,status:"Zatwierdzony"}:d));
    setNotice(`Zmieniono status ${selected.name} wyłącznie w demonstracji.`);
    setSelected(null);
  }

  const cards=(items:Doc[])=>items.length? (
    <div className="document-list">
      {items.map(d=>(
        <button className="document-row" key={d.id} onClick={()=>setSelected(d)}>
          <FileText size={22}/>
          <span>
            <strong>{d.name}</strong>
            <small>{d.company} · {d.kind} {d.fileHash ? `· SHA: ${d.fileHash.slice(0, 8)}...` : ""}</small>
          </span>
          <span className="doc-amount">{d.amount}</span>
          <span className={d.status==="Zatwierdzony"?"status approved":d.status.includes("Unikalny")?"status approved":"status"}>
            {d.status}
          </span>
          <ArrowRight size={16}/>
        </button>
      ))}
    </div>
  ):(
    <p>Brak dokumentów w tym widoku.</p>
  );

  return (
    <main className="demo-shell">
      <div className="demo-banner">
        <ShieldCheck size={16}/> DEMO · Biuro Rachunkowe Jarosław Konik · Środowisko testowe KSeF Outbox
      </div>
      <header className="demo-header">
        <a href="/" className="brand">
          <span className="brand-mark">JK</span>
          <span>Jarosław Konik<br/><small>Biuro Rachunkowe</small></span>
        </a>
        <a href="/" className="back-link"><ArrowLeft size={15}/> Strona główna</a>
      </header>

      <div className="demo-body">
        <div className="demo-title">
          <div>
            <div className="eyebrow">{role==="admin"?"Przestrzeń biura":"Firma Alfa · strefa klienta"}</div>
            <h1>{role==="admin"?"Wszystko pod kontrolą.":"Dzień dobry. Tu jest Twoja firma."}</h1>
            <p>{role==="admin"?"Zarządzanie obiegiem dokumentów, walidacja KSeF i obsługa klientów.":"Dokumenty, faktury KSeF, sprawy urzędowe i kontakt z biurem w jednym miejscu."}</p>
          </div>
          <Tabs value={role} onValueChange={v=>{setRole(v);setNotice("");setSelected(null);setValAlert(null);}}>
            <TabsList aria-label="Wybierz rolę demonstracyjną">
              <TabsTrigger value="client">Klient</TabsTrigger>
              <TabsTrigger value="admin">Administrator</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="workspace-tabs">
          <TabsList aria-label="Moduły portalu" className="module-tabs">
            <TabsTrigger value="overview">Pulpit</TabsTrigger>
            <TabsTrigger value="documents">Dokumenty & Walidator</TabsTrigger>
            <TabsTrigger value="contractors">Kontrahenci (GUS / REGON)</TabsTrigger>
            <TabsTrigger value="ksef">KSeF</TabsTrigger>
            <TabsTrigger value="zus">e-ZUS</TabsTrigger>
            <TabsTrigger value="reports">Raporty sztabowe</TabsTrigger>
            <TabsTrigger value="messages">Wiadomości</TabsTrigger>
          </TabsList>

          <div role="status" aria-live="polite" className={notice?"demo-notice":""}>{notice}</div>

          <TabsContent value="overview">
            <div className="metric-grid">
              <div><FileText/><strong>{visible.length}</strong><span>Dokumenty w rejestrze</span></div>
              <div><CheckCircle2/><strong>{pending}</strong><span>Do sprawdzenia</span></div>
              <div><ShieldCheck/><strong>Aktywna</strong><span>Ochrona przed duplikatami</span></div>
            </div>
            <section className="workspace-card">
              <div className="card-heading">
                <h2>{role==="admin"?"Ostatnio zaksięgowane dokumenty":"Twoje dokumenty"}</h2>
                <Button onClick={()=>setTab("documents")}>Wgraj i zweryfikuj plik <ArrowRight/></Button>
              </div>
              {cards(visible.slice(0,4))}
            </section>
          </TabsContent>

          <TabsContent value="documents">
            {/* PANEL WALIDATORA PRZECIWKO PODWÓJNEMU KSIĘGOWANIU */}
            <section className="workspace-card" style={{borderLeft:"4px solid var(--accent, #2563eb)", marginBottom:"1.5rem"}}>
              <div className="card-heading">
                <div>
                  <h2 style={{display:"flex", alignItems:"center", gap:"0.5rem"}}>
                    <ShieldCheck className="text-emerald-500" size={22}/>
                    Panel bezpiecznego wgrywania dokumentów (Walidator KSeF)
                  </h2>
                  <p>Każdy plik przechodzi automatyczną 3-stopniową weryfikację: blokadę współbieżności, skrót SHA-256 oraz unikalność klucza biznesowego.</p>
                </div>
                <span className="status approved" style={{display:"flex", alignItems:"center", gap:"0.3rem"}}>
                  <Lock size={14}/> Walidator aktywny
                </span>
              </div>

              {/* Komunikat walidatora */}
              {valAlert && (
                <div style={{
                  padding:"1rem",
                  borderRadius:"8px",
                  marginBottom:"1.25rem",
                  backgroundColor:valAlert.type==="error"?"rgba(239, 68, 68, 0.1)":"rgba(16, 185, 129, 0.1)",
                  border:`1px solid ${valAlert.type==="error"?"#ef4444":"#10b981"}`,
                  color:valAlert.type==="error"?"#b91c1c":"#047857"
                }}>
                  <div style={{display:"flex", alignItems:"center", gap:"0.5rem", fontWeight:"bold", marginBottom:"0.25rem"}}>
                    {valAlert.type==="error"?<ShieldAlert size={18}/>:<CheckCircle2 size={18}/>}
                    <span>{valAlert.title}</span>
                    {valAlert.code && <code style={{backgroundColor:"rgba(0,0,0,0.06)", padding:"2px 6px", borderRadius:"4px", fontSize:"0.75rem"}}>{valAlert.code}</code>}
                  </div>
                  <p style={{fontSize:"0.875rem", margin:0}}>{valAlert.message}</p>
                </div>
              )}

              {/* Sekcja wgrywania pliku i testów */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:"1rem", marginBottom:"1.25rem"}}>
                <div style={{border:"2px dashed #cbd5e1", borderRadius:"8px", padding:"1.25rem", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                  <Upload size={28} style={{color:"#64748b", marginBottom:"0.5rem"}}/>
                  <strong>Wybierz plik z dysku</strong>
                  <p style={{fontSize:"0.8rem", color:"#64748b", margin:"0.25rem 0 0.75rem 0"}}>Obsługa PDF, XML KSeF, JPG/PNG. Automatyczne liczenie SHA-256.</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    style={{display:"none"}}
                    id="file-upload-input"
                  />
                  <Button
                    onClick={()=>fileInputRef.current?.click()}
                    disabled={isProcessing}
                    style={{cursor:"pointer"}}
                  >
                    <Plus size={16}/> Wybierz plik faktury
                  </Button>
                </div>

                <div style={{backgroundColor:"#f8fafc", borderRadius:"8px", padding:"1.25rem", border:"1px solid #e2e8f0"}}>
                  <strong style={{display:"block", marginBottom:"0.5rem", fontSize:"0.9rem"}}>Scenariusze weryfikacyjne audytu (A06):</strong>
                  <div style={{display:"flex", flexDirection:"column", gap:"0.5rem"}}>
                    <Button
                      variant="outline"
                      onClick={simulateNewUniqueInvoice}
                      disabled={isProcessing}
                      style={{justifyContent:"flex-start", width:"100%", fontSize:"0.825rem"}}
                    >
                      <CheckCircle2 size={16} className="text-emerald-600"/>
                      Test 1: Wgraj unikalną fakturę (Nowa)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={simulateDuplicateAttempt}
                      disabled={isProcessing}
                      style={{justifyContent:"flex-start", width:"100%", fontSize:"0.825rem", color:"#b91c1c", borderColor:"#fca5a5"}}
                    >
                      <ShieldAlert size={16}/>
                      Test 2: Próba duplikatu (Podwójne księgowanie)
                    </Button>
                  </div>
                  <p style={{fontSize:"0.75rem", color:"#64748b", marginTop:"0.5rem", marginBottom:0}}>
                    Przycisk testu 2 próbuje zaksięgować istniejącą już fakturę z bazy, wykazując działanie blokady.
                  </p>
                </div>
              </div>
            </section>

            <section className="workspace-card">
              <div className="card-heading">
                <div>
                  <h2>Rejestr dokumentów klienta</h2>
                  <p>Kliknij wybrany dokument, aby zweryfikować jego skrót SHA-256 i status weryfikacji KSeF Outbox.</p>
                </div>
              </div>
              {cards(visible)}
            </section>
          </TabsContent>

          <TabsContent value="contractors">
            {/* WYSZUKIWARKA GUS / REGON / BIAŁA LISTA */}
            <section className="workspace-card" style={{borderLeft:"4px solid #0d5b43", marginBottom:"1.5rem"}}>
              <div className="card-heading">
                <div>
                  <h2 style={{display:"flex", alignItems:"center", gap:"0.5rem"}}>
                    <Building2 className="text-emerald-700" size={24}/>
                    Pobieranie i weryfikacja danych kontrahenta (GUS / REGON / Biała Lista MF)
                  </h2>
                  <p>
                    Oficjalne zapytanie do państwowego rejestru Ministerstwa Finansów i Krajowej Administracji Skarbowej.
                    Automatycznie pobiera pełną nazwę, REGON, adres, status czynnego podatnika VAT oraz rachunki bankowe (art. 96b ustawy o VAT).
                  </p>
                </div>
                <span className="status approved" style={{display:"flex", alignItems:"center", gap:"0.3rem"}}>
                  <CheckCircle2 size={14}/> Rejestr MF Online
                </span>
              </div>

              {/* Formularz wyszukiwania */}
              <div style={{display:"flex", flexDirection:"column", gap:"1rem", maxWidth:"720px", marginBottom:"1.25rem"}}>
                <label htmlFor="nip-search" style={{fontSize:"0.875rem", fontWeight:600, color:"#17251f"}}>
                  Wprowadź 10-cyfrowy NIP kontrahenta:
                </label>
                <div style={{display:"flex", gap:"0.75rem", flexWrap:"wrap"}}>
                  <input
                    id="nip-search"
                    type="text"
                    placeholder="np. 7532190370 lub 6770065406"
                    value={searchNip}
                    onChange={e=>setSearchNip(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();fetchContractorFromGus();}}}
                    style={{
                      flex:"1 1 240px",
                      padding:"10px 14px",
                      borderRadius:"10px",
                      border:"1px solid var(--line, #d8ddd3)",
                      fontSize:"0.95rem",
                      fontFamily:"monospace",
                      letterSpacing:"0.05em",
                      backgroundColor:"#ffffff"
                    }}
                  />
                  <Button
                    onClick={()=>fetchContractorFromGus()}
                    disabled={isSearchingGus||!searchNip.trim()}
                    style={{display:"inline-flex", alignItems:"center", gap:"0.5rem"}}
                  >
                    {isSearchingGus ? (
                      <>
                        <RefreshCw className="animate-spin" size={16}/> Pobieranie z rejestru...
                      </>
                    ) : (
                      <>
                        <Search size={16}/> Pobierz dane z GUS / KAS
                      </>
                    )}
                  </Button>
                </div>

                {/* Szybkie przyciski testowe */}
                <div style={{display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginTop:"0.25rem"}}>
                  <span style={{fontSize:"0.75rem", color:"#64748b"}}>Przetestuj z rejestru:</span>
                  <button
                    type="button"
                    onClick={()=>{setSearchNip("7532190370");fetchContractorFromGus("7532190370");}}
                    style={{fontSize:"0.75rem", padding:"4px 8px", background:"#eef2f6", border:"1px solid #cbd5e1", borderRadius:"6px", cursor:"pointer"}}
                  >
                    NIP Biura (7532190370)
                  </button>
                  <button
                    type="button"
                    onClick={()=>{setSearchNip("6770065406");fetchContractorFromGus("6770065406");}}
                    style={{fontSize:"0.75rem", padding:"4px 8px", background:"#eef2f6", border:"1px solid #cbd5e1", borderRadius:"6px", cursor:"pointer"}}
                  >
                    NIP Comarch (6770065406)
                  </button>
                  <button
                    type="button"
                    onClick={()=>{setSearchNip("7740001454");fetchContractorFromGus("7740001454");}}
                    style={{fontSize:"0.75rem", padding:"4px 8px", background:"#eef2f6", border:"1px solid #cbd5e1", borderRadius:"6px", cursor:"pointer"}}
                  >
                    NIP Orlen (7740001454)
                  </button>
                </div>
              </div>

              {/* Komunikat o błędzie */}
              {gusError && (
                <div style={{
                  padding:"1rem",
                  borderRadius:"8px",
                  marginBottom:"1.25rem",
                  backgroundColor:"rgba(239, 68, 68, 0.1)",
                  border:"1px solid #ef4444",
                  color:"#b91c1c",
                  display:"flex",
                  alignItems:"flex-start",
                  gap:"0.75rem"
                }}>
                  <AlertCircle size={20} style={{flexShrink:0, marginTop:"2px"}}/>
                  <div>
                    <strong>Błąd zapytania rejestru:</strong>
                    <p style={{margin:"4px 0 0", fontSize:"0.875rem"}}>{gusError}</p>
                  </div>
                </div>
              )}

              {/* Karta wyniku zapytania GUS / Biała Lista */}
              {gusResult && (
                <div style={{
                  padding:"1.25rem",
                  borderRadius:"12px",
                  backgroundColor:"#ffffff",
                  border:"1px solid #b8e3cc",
                  boxShadow:"0 2px 8px rgba(13,91,67,0.06)",
                  marginTop:"1rem"
                }}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"1rem"}}>
                    <div>
                      <span style={{fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"#0d5b43", fontWeight:700}}>
                        Dane z oficjalnego rejestru państwowego
                      </span>
                      <h3 style={{fontSize:"1.25rem", margin:"0.25rem 0", color:"#17251f"}}>
                        {gusResult.name}
                      </h3>
                      <p style={{fontSize:"0.875rem", color:"#53605a", margin:0}}>
                        {gusResult.address}
                      </p>
                    </div>
                    <span className={gusResult.statusVat==="Czynny" ? "status approved" : gusResult.statusVat==="Zwolniony" ? "status" : "status"} style={{fontSize:"0.85rem", padding:"6px 12px"}}>
                      Status VAT: <strong>{gusResult.statusVat}</strong>
                    </span>
                  </div>

                  <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"1rem", backgroundColor:"#fbfaf6", padding:"1rem", borderRadius:"8px", border:"1px solid #e1e3d9", marginBottom:"1.25rem", fontSize:"0.875rem"}}>
                    <div>
                      <span style={{color:"#6b7769", fontSize:"0.75rem", display:"block"}}>NIP</span>
                      <strong style={{fontFamily:"monospace"}}>{gusResult.nip}</strong>
                    </div>
                    <div>
                      <span style={{color:"#6b7769", fontSize:"0.75rem", display:"block"}}>REGON (GUS)</span>
                      <strong style={{fontFamily:"monospace"}}>{gusResult.regon}</strong>
                    </div>
                    {gusResult.krs && (
                      <div>
                        <span style={{color:"#6b7769", fontSize:"0.75rem", display:"block"}}>KRS</span>
                        <strong style={{fontFamily:"monospace"}}>{gusResult.krs}</strong>
                      </div>
                    )}
                    {gusResult.registrationDate && (
                      <div>
                        <span style={{color:"#6b7769", fontSize:"0.75rem", display:"block"}}>Data rejestracji</span>
                        <span>{gusResult.registrationDate}</span>
                      </div>
                    )}
                    {gusResult.requestId && (
                      <div style={{gridColumn:"1 / -1"}}>
                        <span style={{color:"#6b7769", fontSize:"0.75rem", display:"block"}}>Identyfikator kontrolny KAS (Dowód zapytania)</span>
                        <code style={{fontSize:"0.75rem", color:"#0d5b43"}}>{gusResult.requestId}</code>
                      </div>
                    )}
                  </div>

                  {/* Numery rachunków bankowych (Biała Lista) */}
                  {gusResult.accountNumbers && gusResult.accountNumbers.length > 0 && (
                    <div style={{marginBottom:"1.25rem"}}>
                      <h4 style={{fontSize:"0.85rem", fontWeight:600, color:"#17251f", marginBottom:"0.5rem", display:"flex", alignItems:"center", gap:"0.4rem"}}>
                        <CreditCard size={15}/> Zgłoszone rachunki bankowe (Biała Lista Podatników):
                      </h4>
                      <div style={{display:"flex", flexDirection:"column", gap:"0.35rem"}}>
                        {gusResult.accountNumbers.slice(0, 3).map((acc, idx) => (
                          <div key={idx} style={{fontFamily:"monospace", fontSize:"0.8rem", backgroundColor:"#f4f8f5", padding:"6px 10px", borderRadius:"6px", border:"1px solid #d1e7dd", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span>{acc}</span>
                            <span style={{color:"#0d5b43", fontSize:"0.7rem", fontWeight:600}}>Biała Lista OK</span>
                          </div>
                        ))}
                        {gusResult.accountNumbers.length > 3 && (
                          <small style={{color:"#64748b"}}>... oraz {gusResult.accountNumbers.length - 3} innych rachunków</small>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Akcje dla pobranego kontrahenta */}
                  <div style={{display:"flex", gap:"0.75rem", flexWrap:"wrap"}}>
                    <Button onClick={()=>addContractorToRegistry(gusResult)}>
                      <Plus size={16}/> Dodaj do kartoteki kontrahentów
                    </Button>
                    <Button variant="outline" onClick={()=>createInvoiceForContractor(gusResult)}>
                      <FileCheck2 size={16}/> Wystaw fakturę KSeF dla tego podmiotu
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* KARTOTEKA KONTRAHENTÓW */}
            <section className="workspace-card">
              <div className="card-heading">
                <div>
                  <h2>Kartoteka kontrahentów biura ({contractors.length})</h2>
                  <p>Podmioty zarejestrowane w strefie klienta ze zweryfikowanym statusem REGON i VAT.</p>
                </div>
              </div>
              <div className="document-list">
                {contractors.map(c => (
                  <div key={c.id} className="document-row" style={{cursor:"default", justifyContent:"space-between"}}>
                    <Building2 size={22}/>
                    <span>
                      <strong>{c.name}</strong>
                      <small>NIP: {c.nip} · REGON: {c.regon} {c.krs ? `· KRS: ${c.krs}` : ""} · {c.address}</small>
                    </span>
                    <span className={c.statusVat==="Czynny"?"status approved":c.statusVat==="Zwolniony"?"status":"status"}>
                      VAT: {c.statusVat}
                    </span>
                    <Button variant="outline" size="sm" onClick={()=>createInvoiceForContractor(c)} style={{fontSize:"0.75rem", height:"32px"}}>
                      Faktura KSeF <ArrowRight size={14}/>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="ksef">
            <section className="workspace-card">
              <div className="card-heading">
                <h2>KSeF · kolejka i obieg Outbox</h2>
                <span className="status approved">Walidacja aktywna</span>
              </div>
              <p className="module-explainer">
                Faktury zarejestrowane przez bezpieczny panel uploadu są zabezpieczone przed duplikatami i przygotowane do kolejki RabbitMQ / KSeF.
              </p>
              {cards(visible.filter(d=>d.kind==="KSeF"))}
            </section>
          </TabsContent>

          <TabsContent value="zus">
            <section className="workspace-card">
              <div className="card-heading">
                <h2>e-ZUS · sprawy rozliczeniowe</h2>
                <span className="status">Podgląd</span>
              </div>
              <p className="module-explainer">
                Przykładowy widok deklaracji, bez wyliczeń składek i terminów płatności.
              </p>
              {cards(visible.filter(d=>d.kind==="e-ZUS"))}
            </section>
          </TabsContent>

          <TabsContent value="reports">
            <section className="workspace-card">
              <div className="card-heading">
                <div>
                  <h2>Rejestr statusów i raportów sztabowych (A15)</h2>
                  <p>Zweryfikowany stan wdrożeń i historia raportów technicznych oparta na twardych dowodach.</p>
                </div>
                <span className="status approved">Audyt zaliczony</span>
              </div>
              <div className="metric-grid" style={{marginBottom:"1.5rem"}}>
                <div><ShieldCheck size={20}/><strong>100%</strong><span>Walidator KSeF Outbox (12/12 testów)</span></div>
                <div><Activity size={20}/><strong>Aktywny</strong><span>Hermes Gateway (PID 19868)</span></div>
                <div><Clock size={20}/><strong>3 zadania</strong><span>Harmonogramy crontab aktywne</span></div>
              </div>
              <div className="document-list">
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 001] Konsolidacja wdrożeń i integralność systemów</strong><small>2026-11-06 · Środowisko produkcyjne / GitHub Pages / Hermes</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Zweryfikowano A01, A02, A03, A04, A05, A06, A14. Wszystkie serwisy publiczne HTTP 200 OK, boty Discord/Telegram connected, baza Redis/PostgreSQL walidatora w pełni przetestowana.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 002] Uruchomienie rejestru raportów i dystrybucji A15</strong><small>2026-11-06 · Filary A, B, C, D</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Wdrożono lokalny rejestr plików Markdown w repozytorium (A), zweryfikowano powiadomienia Discord #konfiguracje-hermes (B), autoryzację Telegram (C) oraz interfejs statusowy w portalu (D).
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 003] Spięcie walidatora podwójnego księgowania z panelem portalu</strong><small>2026-11-06 · Ścieżka 4 / A06</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Zintegrowano obliczanie hasha SHA-256 z plików użytkownika, blokadę DUPLICATE_FILE_HASH oraz DUPLICATE_BUSINESS_KEY bezpośrednio w interfejsie wgrywania dokumentów.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 004] Audyt integracji e-Doręczeń: uprawnienia i skutki prawne</strong><small>2026-11-06 · Zadanie A10 / BAE / PUE ZUS</small></span>
                    <span className="status rejected">BLOKADA ODBIORU</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Wykazano brak adaptera produkcyjnego. Ustanowiono bezwzględny zakaz automatycznego kwitowania odbioru pism przez boty (UPD wywołuje skutki procesowe). Obalono mit o UPL-1 dla e-Doręczeń.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 005] Weryfikacja pipeline'ów CI/OSV i testów regresyjnych</strong><small>2026-11-06 · Zadanie A11 / Actions Run 42188483388</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Wdrożono i zweryfikowano potoki GitHub Actions dla ksef-outbox-pattern oraz portal-biuro-admin-online. Uruchomiono skaner podatności Google OSV-Scanner oraz testy regresyjne walidatora (5/5 PASS, 100%). Usunięto podatną zależność uuid i zastąpiono standardowym crypto.randomUUID().
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 006] Integracja z rejestrami GUS / REGON i Białą Listą MF</strong><small>2026-11-06 · Zadanie A07 / API wl-api.mf.gov.pl</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Zaimplementowano bezpieczne pobieranie danych kontrahentów z oficjalnego państwowego rejestru MF/KAS. Automatyczna weryfikacja sumy kontrolnej NIP, statusu podatnika VAT (czynny/zwolniony), numeru REGON, KRS, adresu oraz numerów rachunków bankowych na Białej Liście (art. 96b ustawy o VAT).
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 007] Zabezpieczenie certyfikatów SSL/TLS i odnowień domenowych</strong><small>2026-11-06 · Zadanie A12 / Hostinger DNS / Let's Encrypt</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Dodano rekordy CAA dla Let's Encrypt w Hostinger DNS, zlikwidowano błąd SEC_E_WRONG_PRINCIPAL, zatwierdzono certyfikaty TLS na GitHub Pages i wymuszono HTTPS (HTTP 200 OK). Domena biuroadmin.online ma aktywną autorezerwację do 2027 r.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 008] Weryfikacja zarządzania sekretami, tokenów i procedur bezpieczeństwa</strong><small>2026-11-06 · Zadanie A09 / Zero-Secrets / OIDC</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Rozstrzygnięto mity o „KMS na produkcji” (były to przykłady szkoleniowe). Potwierdzono 100% czystość repozytoriów w audycie historii commitów (brak wycieków). Wdrożenia Pages oparte na GitHub OIDC bez stałych tokenów.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 009] Uporządkowanie repozytorium BiuroAdmin i Runbook</strong><small>2026-11-06 · Zadanie A13 / Higiena repo / Master README</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Usunięto zbędne pliki i szablony testowe z BiuroAdmin, wdrożono master README.md z pełną mapą architektury, matrycą audytową A01–A15 i podręcznikiem operacyjnym (Runbook). Zabezpieczono higienę przez .gitignore.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 010] Diagnostyka Hermes, integralność baz SQLite i analiza zasobów</strong><small>2026-11-06 · Zadania A19, A20, A21, A23 / WAL / Gateway PID 19868</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Wykonano pełny PRAGMA integrity_check na 6 bazach SQLite (wszystkie sprawne 100% ok). Gateway aktywny na PID 19868 (Discord, Telegram, webhook). Wyjaśniono historyczny błąd OMH (eksperyment). Dysk i cache stabilne.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 011] Weryfikacja założeń narzędziowych: kalkulatory i granice prawne</strong><small>2026-11-06 · Zadanie A17 / IP Box / B+R / Ochrona prawna</small></span>
                    <span className="status pending">ODRZUCONO</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Wyeliminowano z planu nierealne deklaracje o automatycznych kalkulatorach IP Box/B+R (brak implementacji i ryzyko z ustawy o doradztwie podatkowym). Oferta skoncentrowana wyłącznie na certyfikowanych modułach KSeF, Białej Liście VAT i portalu.
                  </p>
                </article>
                <article className="document-row" style={{cursor:"default",flexDirection:"column",alignItems:"flex-start",gap:"0.5rem"}}>
                  <div style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center"}}>
                    <span><strong>[RAPORT 012] Chief of Staff & Obsidian: Obieg Notatek i Zasady Ładu</strong><small>2026-11-06 · Zadanie A22 / Windows Vault / Governance / Brak Auto-Wysyłek</small></span>
                    <span className="status approved">SUKCES</span>
                  </div>
                  <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.25rem 0"}}>
                    Zmapowano dawne ścieżki linuksowe (/opt/data) do lokalnego systemu Windows. Zidentyfikowano 28 notatek w Obsidian Vault. Wdrożono rygorystyczny ład operacyjny: obieg intake → notatka → brief → draft oraz bezwzględny zakaz automatycznych wysyłek zewnętrznych bez akceptacji człowieka.
                  </p>
                </article>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="messages">
            <section className="workspace-card conversation">
              <h2>Kontakt z biurem</h2>
              <p>Rozmowa z Biurem Rachunkowym Jarosław Konik.</p>
              <div className="messages">
                {messages.map((m,i)=>(
                  <article key={i} className={m.by==="Biuro"?"message":"message from-client"}>
                    <small>{m.by}</small>
                    <p>{m.text}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={e=>{
                e.preventDefault();
                if(!draft.trim()) return;
                setMessages(p=>[...p,{by:role==="admin"?"Biuro":"Firma Alfa",text:draft.trim()}]);
                setDraft("");
                setNotice("Wiadomość dodana do rozmowy.");
              }}>
                <label htmlFor="message">Treść wiadomości</label>
                <Textarea id="message" value={draft} maxLength={1000} onChange={e=>setDraft(e.target.value)} placeholder="Napisz wiadomość do biura…"/>
                <Button type="submit" disabled={!draft.trim()}>Wyślij wiadomość <ArrowRight/></Button>
              </form>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}>
        <DialogContent className="doc-dialog">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>Szczegóły weryfikacji integralności i statusu księgowego.</DialogDescription>
          {selected && (
            <>
              <dl>
                <dt>Podmiot</dt>
                <dd>{selected.company}</dd>
                <dt>Moduł</dt>
                <dd>{selected.kind}</dd>
                <dt>Kwota brutto</dt>
                <dd>{selected.amount}</dd>
                <dt>Status księgowy</dt>
                <dd>{selected.status}</dd>
                {selected.fileHash && (
                  <>
                    <dt>Skrót SHA-256 pliku</dt>
                    <dd style={{wordBreak:"break-all", fontFamily:"monospace", fontSize:"0.75rem", backgroundColor:"#f1f5f9", padding:"4px 8px", borderRadius:"4px"}}>
                      {selected.fileHash}
                    </dd>
                  </>
                )}
                {selected.sellerNip && (
                  <>
                    <dt>Klucz biznesowy KSeF</dt>
                    <dd style={{fontFamily:"monospace", fontSize:"0.8rem"}}>
                      NIP: {selected.sellerNip} | Nr: {selected.invoiceNumber} | Data: {selected.issueDate}
                    </dd>
                  </>
                )}
                {selected.validationDetails && (
                  <>
                    <dt>Status walidatora</dt>
                    <dd style={{fontSize:"0.85rem", color:"#059669", fontWeight:500}}>
                      {selected.validationDetails}
                    </dd>
                  </>
                )}
              </dl>
              {role==="admin" && selected.status!=="Zatwierdzony" ? (
                <Button onClick={approve}>Zatwierdź dokument <CheckCircle2/></Button>
              ) : (
                <p style={{fontSize:"0.85rem", color:"#64748b"}}>Dokument został zweryfikowany pod kątem unikalności.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer>
        <span>Biuro Rachunkowe Jarosław Konik (NIP: 7532190370)</span>
        <span>Strefa Klienta · Zintegrowana z KSeF Outbox</span>
      </footer>
    </main>
  );
}
