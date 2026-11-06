"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight,FileText,MessageSquare,ShieldCheck,Plus,CheckCircle2,Landmark} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Textarea} from "@/components/ui/textarea";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";

type Doc={id:number;name:string;company:string;amount:string;status:string;kind:string};
const initial:Doc[]=[{id:1,name:"FV/DEMO/001",company:"Firma Alfa (demo)",amount:"2 460,00 zł",status:"Do sprawdzenia",kind:"KSeF"},{id:2,name:"FV/DEMO/002",company:"Firma Alfa (demo)",amount:"615,00 zł",status:"Zatwierdzony",kind:"Dokumenty"},{id:3,name:"DRA — przykład",company:"Firma Alfa (demo)",amount:"Przykład bez wyliczeń",status:"Do sprawdzenia",kind:"e-ZUS"},{id:4,name:"FV/DEMO/003",company:"Firma Beta (demo)",amount:"1 230,00 zł",status:"Do sprawdzenia",kind:"KSeF"}];
export default function Demo(){
 const [role,setRole]=useState("client"),[tab,setTab]=useState("overview"),[docs,setDocs]=useState(initial),[selected,setSelected]=useState<Doc|null>(null),[notice,setNotice]=useState(""),[draft,setDraft]=useState("");
 const [messages,setMessages]=useState([{by:"Biuro",text:"Witamy w demonstracji. W zakładce Dokumenty czeka przykładowa faktura do sprawdzenia."}]);
 useEffect(()=>{
   const params = new URLSearchParams(window.location.search);
   const hashParams = typeof window !== "undefined" ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : new URLSearchParams();
   if(params.get("role")==="admin") setRole("admin");
   if(params.get("auth")==="google" || hashParams.get("access_token") || (typeof window !== "undefined" && window.location.pathname.includes("callback"))) {
     setNotice("Zalogowano pomyślnie przez Google OAuth. Dostęp do przestrzeni klienta aktywny.");
   }
 },[]);
 const visible=docs.filter(d=>role==="admin"||d.company==="Firma Alfa (demo)");
 const pending=visible.filter(d=>d.status==="Do sprawdzenia").length;
 function add(){setDocs(p=>[...p,{id:Math.max(...p.map(d=>d.id))+1,name:`Dokument demo ${p.length+1}`,company:"Firma Alfa (demo)",amount:"100,00 zł",status:"Do sprawdzenia",kind:"Dokumenty"}]);setNotice("Dodano fikcyjny dokument. Żaden plik nie został przesłany.");setTab("documents")}
 function approve(){if(!selected)return;setDocs(p=>p.map(d=>d.id===selected.id?{...d,status:"Zatwierdzony"}:d));setNotice(`Zmieniono status ${selected.name} wyłącznie w demonstracji.`);setSelected(null)}
 const cards=(items:Doc[])=>items.length? <div className="document-list">{items.map(d=><button className="document-row" key={d.id} onClick={()=>setSelected(d)}><FileText size={22}/><span><strong>{d.name}</strong><small>{d.company} · {d.kind}</small></span><span className="doc-amount">{d.amount}</span><span className={d.status==="Zatwierdzony"?"status approved":"status"}>{d.status}</span><ArrowRight size={16}/></button>)}</div>:<p>Brak dokumentów w tym widoku.</p>;
 return <main className="demo-shell">
  <div className="demo-banner"><ShieldCheck size={16}/> DEMO · Fikcyjne dane · Bez integracji · Zmiany tylko do odświeżenia strony</div>
  <header className="demo-header"><a href="/" className="brand"><span className="brand-mark">JK</span><span>Jarosław Konik<br/><small>Biuro Rachunkowe</small></span></a><a href="/" className="back-link"><ArrowLeft size={15}/> Strona główna</a></header>
  <div className="demo-body">
   <div className="demo-title"><div><div className="eyebrow">{role==="admin"?"Przestrzeń biura":"Firma Alfa · konto demonstracyjne"}</div><h1>{role==="admin"?"Wszystko pod kontrolą.":"Dzień dobry. Tu jest Twoja firma."}</h1><p>{role==="admin"?"Przegląd dokumentów dwóch fikcyjnych firm i obsługa korespondencji.":"Dokumenty, sprawy urzędowe i kontakt z biurem w jednym miejscu."}</p></div><Tabs value={role} onValueChange={v=>{setRole(v);setNotice("");setSelected(null)}}><TabsList aria-label="Wybierz rolę demonstracyjną"><TabsTrigger value="client">Klient</TabsTrigger><TabsTrigger value="admin">Administrator</TabsTrigger></TabsList></Tabs></div>
   <p className="demo-disclaimer">Przełącznik pokazuje dwa widoki, nie nadaje rzeczywistych uprawnień. Nie wpisuj danych osobowych, haseł ani informacji księgowych.</p>
   <Tabs value={tab} onValueChange={setTab} className="workspace-tabs"><TabsList aria-label="Moduły portalu" className="module-tabs"><TabsTrigger value="overview">Pulpit</TabsTrigger><TabsTrigger value="documents">Dokumenty</TabsTrigger><TabsTrigger value="ksef">KSeF</TabsTrigger><TabsTrigger value="zus">e-ZUS</TabsTrigger><TabsTrigger value="messages">Wiadomości</TabsTrigger></TabsList>
   <div role="status" aria-live="polite" className={notice?"demo-notice":""}>{notice}</div>
   <TabsContent value="overview"><div className="metric-grid"><div><FileText/><strong>{visible.length}</strong><span>Dokumenty demonstracyjne</span></div><div><CheckCircle2/><strong>{pending}</strong><span>Do sprawdzenia</span></div><div><MessageSquare/><strong>{messages.length}</strong><span>Wiadomości w rozmowie demo</span></div></div><section className="workspace-card"><div className="card-heading"><h2>{role==="admin"?"Dokumenty klientów":"Twoje dokumenty"}</h2><Button onClick={()=>setTab("documents")}>Przejdź do dokumentów <ArrowRight/></Button></div>{cards(visible.slice(0,3))}</section><div className="integration-note"><Landmark/><div><strong>KSeF i e-ZUS pozostają niepodłączone</strong><p>Możesz obejrzeć przykładowe widoki. Demo nie pobiera faktur ani nie wysyła deklaracji.</p></div></div></TabsContent>
   <TabsContent value="documents"><section className="workspace-card"><div className="card-heading"><div><h2>Dokumenty</h2><p>Kliknij dokument, aby zobaczyć szczegóły{role==="admin"?" i zmienić jego status":""}.</p></div><Button onClick={add}><Plus/> Dodaj przykład</Button></div>{cards(visible)}</section></TabsContent>
   <TabsContent value="ksef"><section className="workspace-card"><div className="card-heading"><h2>KSeF · podgląd obiegu faktur</h2><span className="status">Niepodłączony</span></div><p className="module-explainer">To fikcyjne faktury demonstracyjne. Nie mają numerów ani potwierdzeń z KSeF. Żaden status na tej stronie nie jest urzędowym potwierdzeniem.</p>{cards(visible.filter(d=>d.kind==="KSeF"))}</section></TabsContent>
   <TabsContent value="zus"><section className="workspace-card"><div className="card-heading"><h2>e-ZUS · sprawy rozliczeniowe</h2><span className="status">Niepodłączony</span></div><p className="module-explainer">Przykładowy widok deklaracji, bez wyliczeń składek i terminów płatności. Portal nie ma dostępu do ZUS i niczego nie wysyła.</p>{cards(visible.filter(d=>d.kind==="e-ZUS"))}</section></TabsContent>
   <TabsContent value="messages"><section className="workspace-card conversation"><h2>Kontakt z biurem</h2><p>Rozmowa demonstracyjna z Firmą Alfa. Przełącz rolę, aby odpowiedzieć jako biuro.</p><div className="messages">{messages.map((m,i)=><article key={i} className={m.by==="Biuro"?"message":"message from-client"}><small>{m.by} · demo</small><p>{m.text}</p></article>)}</div><form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;setMessages(p=>[...p,{by:role==="admin"?"Biuro":"Firma Alfa",text:draft.trim()}]);setDraft("");setNotice("Wiadomość dodana tylko do lokalnej rozmowy demo — nigdzie jej nie wysłano.")}}><label htmlFor="message">Treść testowa</label><Textarea id="message" value={draft} maxLength={1000} onChange={e=>setDraft(e.target.value)} placeholder="Napisz przykładową wiadomość bez danych osobowych…"/><Button type="submit" disabled={!draft.trim()}>Dodaj wiadomość demo <ArrowRight/></Button></form></section></TabsContent>
   </Tabs>
  </div>
  <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="doc-dialog"><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>Fikcyjny dokument — nie jest dowodem księgowym.</DialogDescription>{selected&&<><dl><dt>Firma</dt><dd>{selected.company}</dd><dt>Moduł</dt><dd>{selected.kind}</dd><dt>Kwota przykładowa</dt><dd>{selected.amount}</dd><dt>Status w demo</dt><dd>{selected.status}</dd></dl>{role==="admin"&&selected.status!=="Zatwierdzony"?<Button onClick={approve}>Zatwierdź w demo <CheckCircle2/></Button>:<p>{role==="admin"?"Dokument został zatwierdzony w demonstracji.":"W widoku klienta dostępny jest podgląd. Status zmienia administrator w demo."}</p>}</>}</DialogContent></Dialog>
  <footer><span>Biuro Rachunkowe Jarosław Konik</span><span>Demonstracja · bez danych produkcyjnych</span></footer>
 </main>
}
