import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  CRICROAR — Fan War Room for Cricket 2026
//  Replace these keys to go live:
// ═══════════════════════════════════════════════════════════════
const CFG = {
  CRICKET_API : import.meta.env.VITE_CRICKET_API  || "YOUR_CRICKETDATA_API_KEY",
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL",
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || "YOUR_SUPABASE_ANON_KEY",
  RAZORPAY_KEY: import.meta.env.VITE_RAZORPAY_KEY || "YOUR_RAZORPAY_KEY_ID",
  PLAN_AMOUNT : 4900, // ₹49 in paise
};

// ── Supabase tables needed ─────────────────────────────────────
// CREATE TABLE users (id text primary key, name text, plan text default 'free', roasts_today int default 0, last_roast_date text, created_at timestamptz default now());
// CREATE TABLE roasts (id bigserial primary key, match_id text, user_id text, user_name text, team text, text text, votes int default 0, reports int default 0, hidden boolean default false, created_at timestamptz default now());
// CREATE TABLE predictions (id bigserial primary key, match_id text, team text, user_id text, value int, created_at timestamptz default now());

const TEAMS = {
  RCB : { n:"Royal Challengers Bengaluru", s:"RCB",  c:"#E8173A", a:"#F5C518", g:"linear-gradient(135deg,#E8173A,#8B0000)" },
  MI  : { n:"Mumbai Indians",              s:"MI",   c:"#005DA0", a:"#40C4FF", g:"linear-gradient(135deg,#005DA0,#003366)" },
  CSK : { n:"Chennai Super Kings",         s:"CSK",  c:"#F5C518", a:"#005DA0", g:"linear-gradient(135deg,#F5C518,#B8860B)" },
  KKR : { n:"Kolkata Knight Riders",       s:"KKR",  c:"#7B2FBE", a:"#F5C518", g:"linear-gradient(135deg,#7B2FBE,#3D0066)" },
  SRH : { n:"Sunrisers Hyderabad",         s:"SRH",  c:"#FF6600", a:"#FFE066", g:"linear-gradient(135deg,#FF6600,#CC3300)" },
  DC  : { n:"Delhi Capitals",              s:"DC",   c:"#0057A8", a:"#FF3B3B", g:"linear-gradient(135deg,#0057A8,#CC0000)" },
  PBKS: { n:"Punjab Kings",               s:"PBKS", c:"#CC1133", a:"#FFD700", g:"linear-gradient(135deg,#CC1133,#880022)" },
  GT  : { n:"Gujarat Titans",             s:"GT",   c:"#1A3F7A", a:"#C8A96E", g:"linear-gradient(135deg,#1A3F7A,#0A1F3A)" },
  LSG : { n:"Lucknow Super Giants",       s:"LSG",  c:"#A0285A", a:"#F9D342", g:"linear-gradient(135deg,#A0285A,#60103A)" },
  RR  : { n:"Rajasthan Royals",           s:"RR",   c:"#2B4BAA", a:"#FF9ECD", g:"linear-gradient(135deg,#2B4BAA,#0A1F6A)" },
};

const DEMO_MATCHES = [
  { id:"m1", t1:"RCB", t2:"MI",  status:"LIVE",     time:"7:30 PM", venue:"Chinnaswamy, Bengaluru", s1:"156/4", ov1:"18.2", s2:null, ov2:null, crr:"8.49", rrr:"14.2" },
  { id:"m2", t1:"CSK", t2:"KKR", status:"TODAY",    time:"3:30 PM", venue:"Chepauk, Chennai",      s1:null, ov1:null, s2:null, ov2:null },
  { id:"m3", t1:"SRH", t2:"DC",  status:"UPCOMING", time:"Mar 27",  venue:"Uppal, Hyderabad",      s1:null, ov1:null, s2:null, ov2:null },
];

const DEMO_ROASTS = [
  { id:1, match_id:"m1", user_id:"u1", user_name:"RCBMacha",    team:"RCB", text:"MI hasn't won in 2 years. What are we even doing here 😭", votes:47, reports:0, hidden:false },
  { id:2, match_id:"m1", user_id:"u2", user_name:"BombayBlues", team:"MI",  text:"RCB fans practicing 'next year' speeches since 2008 💀", votes:89, reports:0, hidden:false },
  { id:3, match_id:"m1", user_id:"u3", user_name:"KingKohli77", team:"RCB", text:"Rohit retired just so MI fans had something else to cry about", votes:31, reports:0, hidden:false },
  { id:4, match_id:"m1", user_id:"u4", user_name:"SeaFaceKing", team:"MI",  text:"0 trophies, 100% confidence. Only RCB fans can manage this ratio", votes:64, reports:0, hidden:false },
];

// ── Supabase client ────────────────────────────────────────────
function makeSB(url, key) {
  const h = { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" };
  const req = (path, opts={}) => fetch(`${url}/rest/v1/${path}`, { headers:h, ...opts }).then(r => r.ok ? r.json() : []).catch(()=>[]);
  return {
    getRoasts : (mid)    => req(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=100`),
    postRoast : (msg)    => req(`roasts`, { method:"POST", body:JSON.stringify(msg) }),
    patchVotes: (id,v)   => req(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({votes:v}) }),
    patchReport:(id,r,h) => req(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({reports:r,hidden:h}) }),
    getUser   : (id)     => req(`users?id=eq.${id}`).then(r=>r[0]||null),
    upsertUser: (u)      => req(`users`, { method:"POST", headers:{...h,Prefer:"resolution=merge-duplicates,return=representation"}, body:JSON.stringify(u) }),
    getPreds  : (mid)    => req(`predictions?match_id=eq.${mid}`),
    postPred  : (p)      => req(`predictions`, { method:"POST", body:JSON.stringify(p) }),
    poll      : (mid,cb) => { const t=setInterval(()=>req(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=100`).then(cb),4000); return ()=>clearInterval(t); },
  };
}

// ── AI Moderate ────────────────────────────────────────────────
async function moderate(text) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:10,
        messages:[{role:"user",content:`Cricket fan banter moderation. Reply SAFE or BLOCK only.\nBLOCK: hate speech, casteism, slurs, threats, sexual content, doxxing, targeted harassment.\nSAFE: team rivalry jokes, player performance banter, cricket trash talk.\nMessage: "${text}"`}]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text?.trim().toUpperCase().startsWith("BLOCK") ? "BLOCK" : "SAFE";
  } catch { return "SAFE"; }
}

// ── AI Roast ───────────────────────────────────────────────────
async function genRoast(team) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:80,
        messages:[{role:"user",content:`Savage cricket roast bot. ONE brutal funny roast max 12 words targeting ${TEAMS[team]?.n||team} fans. Pure cricket banter, no slurs. Just the roast text.`}]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text?.trim()||null;
  } catch { return null; }
}

// ── Live Scores ────────────────────────────────────────────────
async function fetchScores() {
  if (CFG.CRICKET_API==="YOUR_CRICKETDATA_API_KEY") return null;
  try {
    const r = await fetch(`https://api.cricketdata.org/cricket/?apikey=${CFG.CRICKET_API}&offset=0`);
    const d = await r.json();
    if (d.status!=="success") return null;
    const resolveT = name => { if(!name)return null; const u=name.toUpperCase(); return Object.keys(TEAMS).find(k=>u.includes(k)||TEAMS[k].n.toUpperCase().split(" ").some(w=>w.length>3&&u.includes(w)))||name; };
    return (d.data||[]).filter(m=>(m.name||"").toLowerCase().includes("ipl")).slice(0,6).map(m=>({
      id:m.id, t1:resolveT(m.teams?.[0]), t2:resolveT(m.teams?.[1]),
      status: m.matchStarted&&!m.matchEnded?"LIVE":m.matchEnded?"ENDED":"UPCOMING",
      time:m.date||"", venue:m.venue||"",
      s1:m.score?.[0]?`${m.score[0].r}/${m.score[0].w}`:null, ov1:m.score?.[0]?.o||null,
      s2:m.score?.[1]?`${m.score[1].r}/${m.score[1].w}`:null, ov2:m.score?.[1]?.o||null,
    }));
  } catch { return null; }
}

// ── Razorpay ───────────────────────────────────────────────────
function openRazorpay(userId, userName, onSuccess) {
  if (!window.Razorpay) { alert("Payment loading... try again in a second"); return; }
  const options = {
    key: CFG.RAZORPAY_KEY,
    amount: CFG.PLAN_AMOUNT,
    currency: "INR",
    name: "CricRoar",
    description: "Pro Plan — 1 Month",
    image: "https://via.placeholder.com/60/E8173A/fff?text=CR",
    handler: (response) => onSuccess(response),
    prefill: { name: userName },
    theme: { color: "#E8173A" },
    modal: { ondismiss: ()=>{} }
  };
  new window.Razorpay(options).open();
}

// ── Utils ──────────────────────────────────────────────────────
const uid = () => `u_${Math.random().toString(36).slice(2,10)}`;
const today = () => new Date().toISOString().slice(0,10);
const FREE_ROAST_LIMIT = 3;

// ═══════════════════════════════════════════════════════════════
//  GLOBAL CSS
// ═══════════════════════════════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  :root {
    --bg: #09090F;
    --surface: #13131E;
    --surface2: #1C1C2E;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --text: #F0F0FF;
    --muted: #6B6B8A;
    --red: #E8173A;
    --red2: #FF3D5C;
    --gold: #F5C518;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:var(--red); border-radius:2px; }
  .syne { font-family:'Syne',sans-serif; }
  .btn { transition:all .18s cubic-bezier(.4,0,.2,1); cursor:pointer; border:none; outline:none; }
  .btn:hover { transform:translateY(-1px); filter:brightness(1.1); }
  .btn:active { transform:scale(.97); }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:16px; }
  .up { animation:up .35s cubic-bezier(.4,0,.2,1); }
  @keyframes up { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
  .pop { animation:pop .3s cubic-bezier(.4,0,.2,1); }
  @keyframes pop { 0%{transform:scale(.9);opacity:0} 100%{transform:scale(1);opacity:1} }
  .pulse { animation:pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
  .shake { animation:shake .4s; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .glow-in { animation:glowIn .5s ease-out; }
  @keyframes glowIn { from{opacity:0;filter:blur(8px)} to{opacity:1;filter:blur(0)} }
  input:focus,textarea:focus { outline:none; }
  input::placeholder { color:var(--muted); }
  .noise { position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  }
  .tab-active { background:var(--red) !important; color:#fff !important; }
`;

// ═══════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════
export default function CricRoar() {
  // ── State ──────────────────────────────────────────────────
  const [screen, setScreen]       = useState("tos");
  const [tab, setTab]             = useState("scores");   // scores | war
  const [matches, setMatches]     = useState(DEMO_MATCHES);
  const [selMatch, setSelMatch]   = useState(null);
  const [myTeam, setMyTeam]       = useState(null);
  const [roasts, setRoasts]       = useState([]);
  const [preds, setPreds]         = useState({});         // { matchId: { t1: 60, t2: 40 } }
  const [userPred, setUserPred]   = useState({});         // { matchId: team }
  const [input, setInput]         = useState("");
  const [meter, setMeter]         = useState(48);
  const [sending, setSending]     = useState(false);
  const [blocked, setBlocked]     = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast]         = useState(null);
  const [voted, setVoted]         = useState({});
  const [reported, setReported]   = useState({});
  const [user, setUser]           = useState(null);       // { id, name, plan, roasts_today, last_roast_date }
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [paySuccess, setPaySuccess]   = useState(false);
  const [nameInput, setNameInput]     = useState("");
  const [showName, setShowName]       = useState(false);
  const sb  = useRef(CFG.SUPABASE_URL!=="YOUR_SUPABASE_URL" ? makeSB(CFG.SUPABASE_URL,CFG.SUPABASE_KEY) : null);
  const chatRef = useRef(null);
  const isDemo = !sb.current;

  const match   = matches.find(m=>m.id===selMatch);
  const T1      = match ? (TEAMS[match.t1]||{s:match.t1,c:"#888",a:"#fff",g:"#333",n:match.t1}) : null;
  const T2      = match ? (TEAMS[match.t2]||{s:match.t2,c:"#888",a:"#fff",g:"#333",n:match.t2}) : null;
  const MT      = myTeam ? (TEAMS[myTeam]||{s:myTeam,c:"#888",a:"#fff",g:"#333",n:myTeam}) : null;
  const OT      = myTeam && match ? (myTeam===match.t1?T2:T1) : null;
  const oppKey  = myTeam && match ? (myTeam===match.t1?match.t2:match.t1) : null;
  const topRoaster = [...roasts].sort((a,b)=>(b.votes||0)-(a.votes||0))[0];
  const myPct   = Math.round(meter);
  const isPro   = user?.plan==="pro";
  const roastsLeft = isPro ? Infinity : FREE_ROAST_LIMIT - (user?.last_roast_date===today() ? (user?.roasts_today||0) : 0);

  // ── Init user ────────────────────────────────────────────────
  useEffect(()=>{
    let stored = localStorage.getItem("cr_user");
    if (stored) { setUser(JSON.parse(stored)); return; }
    setShowName(true);
  },[]);

  const createUser = (name) => {
    const u = { id:uid(), name:name||"Fan"+Math.floor(Math.random()*9999), plan:"free", roasts_today:0, last_roast_date:"" };
    localStorage.setItem("cr_user", JSON.stringify(u));
    setUser(u);
    setShowName(false);
    setScreen("main");
    if (!isDemo) sb.current.upsertUser(u);
  };

  // ── Load Razorpay ────────────────────────────────────────────
  useEffect(()=>{
    if (document.getElementById("rzp-script")) return;
    const s = document.createElement("script");
    s.id="rzp-script"; s.src="https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(s);
  },[]);

  // ── Live scores ──────────────────────────────────────────────
  useEffect(()=>{
    if (CFG.CRICKET_API==="YOUR_CRICKETDATA_API_KEY") return;
    fetchScores().then(d=>{ if(d?.length) setMatches(d); });
    const t=setInterval(()=>fetchScores().then(d=>{ if(d?.length) setMatches(d); }),30000);
    return ()=>clearInterval(t);
  },[]);

  // ── Roasts ───────────────────────────────────────────────────
  useEffect(()=>{
    if (!selMatch) return;
    if (isDemo) { setRoasts(DEMO_ROASTS); return; }
    sb.current.getRoasts(selMatch).then(setRoasts);
    return sb.current.poll(selMatch, setRoasts);
  },[selMatch,isDemo]);

  // ── Predictions ──────────────────────────────────────────────
  useEffect(()=>{
    if (!selMatch||isDemo) return;
    sb.current.getPreds(selMatch).then(rows=>{
      if (!rows.length) return;
      const counts = {};
      rows.forEach(r=>{ counts[r.team]=(counts[r.team]||0)+1; });
      const total = Object.values(counts).reduce((a,b)=>a+b,0);
      if (total>0) {
        const t1pct = Math.round(((counts[match?.t1]||0)/total)*100);
        setPreds(p=>({...p,[selMatch]:{t1:t1pct,t2:100-t1pct}}));
      }
    });
  },[selMatch]);

  // ── Scroll ───────────────────────────────────────────────────
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[roasts]);

  // ── Meter drift ───────────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="war") return;
    const t=setInterval(()=>setMeter(p=>Math.max(18,Math.min(82,p+(Math.random()-.5)*5))),2800);
    return ()=>clearInterval(t);
  },[screen]);

  // ── Send roast ────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim()||!myTeam||!selMatch||sending) return;
    // Free plan limit
    if (!isPro && roastsLeft <= 0) { setShowPaywall(true); return; }
    setSending(true); setBlocked(false);
    const verdict = await moderate(input.trim());
    if (verdict==="BLOCK") { setBlocked(true); setSending(false); setTimeout(()=>setBlocked(false),3000); return; }
    const msg = { match_id:selMatch, user_id:user?.id||"anon", user_name:user?.name||"Fan", team:myTeam, text:input.trim(), votes:0, reports:0, hidden:false };
    setInput("");
    if (isDemo) setRoasts(p=>[...p,{...msg,id:Date.now()}]);
    else { setRoasts(p=>[...p,{...msg,id:"p_"+Date.now()}]); sb.current.postRoast(msg); }
    // Update roast count
    if (!isPro && user) {
      const isNewDay = user.last_roast_date !== today();
      const newCount = isNewDay ? 1 : (user.roasts_today||0)+1;
      const newUser = {...user, roasts_today:newCount, last_roast_date:today()};
      setUser(newUser); localStorage.setItem("cr_user",JSON.stringify(newUser));
      if (!isDemo) sb.current.upsertUser(newUser);
    }
    setMeter(p=>myTeam===match?.t1?Math.min(82,p+4):Math.max(18,p-4));
    setSending(false);
  };

  // ── Vote ──────────────────────────────────────────────────────
  const doVote = async (id,delta) => {
    if (voted[id]) return;
    setVoted(p=>({...p,[id]:delta}));
    setRoasts(p=>p.map(m=>m.id===id?{...m,votes:(m.votes||0)+delta}:m));
    if (!isDemo) { const m=roasts.find(x=>x.id===id); if(m) sb.current.patchVotes(id,(m.votes||0)+delta); }
  };

  // ── Report ────────────────────────────────────────────────────
  const doReport = async (id) => {
    if (reported[id]) return;
    setReported(p=>({...p,[id]:true}));
    setRoasts(p=>p.map(m=>{ if(m.id!==id)return m; const nr=(m.reports||0)+1; return {...m,reports:nr,hidden:nr>=3}; }));
    if (!isDemo) { const m=roasts.find(x=>x.id===id); if(m) sb.current.patchReport(id,(m.reports||0)+1,(m.reports||0)+1>=3); }
  };

  // ── AI Roast ──────────────────────────────────────────────────
  const doAIRoast = async () => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (!oppKey) return;
    setAiLoading(true);
    const r = await genRoast(oppKey);
    if (r) {
      const aiMsg = {id:Date.now(),match_id:selMatch,user_id:"bot",user_name:"RoastBot AI",team:myTeam,text:r,votes:0,reports:0,hidden:false,isAI:true};
      setRoasts(p=>[...p,aiMsg]);
      setToast(r); setTimeout(()=>setToast(null),5000);
    }
    setAiLoading(false);
  };

  // ── Predict ───────────────────────────────────────────────────
  const doPredict = async (matchId, team) => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (userPred[matchId]) return;
    setUserPred(p=>({...p,[matchId]:team}));
    // Update local prediction display
    setPreds(p=>{
      const cur = p[matchId]||{t1:50,t2:50};
      const m = matches.find(x=>x.id===matchId);
      const isT1 = team===m?.t1;
      const newT1 = isT1 ? Math.min(90,cur.t1+3) : Math.max(10,cur.t1-3);
      return {...p,[matchId]:{t1:newT1,t2:100-newT1}};
    });
    if (!isDemo&&user) sb.current.postPred({match_id:matchId,team,user_id:user.id,value:1});
  };

  // ── Payment ───────────────────────────────────────────────────
  const buyPro = () => {
    if (CFG.RAZORPAY_KEY==="YOUR_RAZORPAY_KEY_ID") {
      // Demo success
      const newUser = {...user,plan:"pro"};
      setUser(newUser); localStorage.setItem("cr_user",JSON.stringify(newUser));
      if(!isDemo&&user) sb.current.upsertUser(newUser);
      setShowPaywall(false); setShowUpgrade(false); setPaySuccess(true);
      setTimeout(()=>setPaySuccess(false),4000);
      return;
    }
    openRazorpay(user?.id, user?.name, ()=>{
      const newUser = {...user,plan:"pro"};
      setUser(newUser); localStorage.setItem("cr_user",JSON.stringify(newUser));
      if(!isDemo&&user) sb.current.upsertUser(newUser);
      setShowPaywall(false); setShowUpgrade(false); setPaySuccess(true);
      setTimeout(()=>setPaySuccess(false),4000);
    });
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────

  // Score Card
  const ScoreCard = ({m, onClick}) => {
    const t1 = TEAMS[m.t1]||{s:m.t1,c:"#888",a:"#fff",g:"#333"};
    const t2 = TEAMS[m.t2]||{s:m.t2,c:"#888",a:"#fff",g:"#333"};
    const pred = preds[m.id];
    return (
      <div className="card btn up" onClick={onClick} style={{padding:"18px 20px",marginBottom:12,cursor:"pointer",position:"relative",overflow:"hidden"}}>
        {/* Subtle bg glow */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${t1.c},${t2.c})`,opacity:.6}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--muted)",letterSpacing:.5}}>{m.venue||m.time}</div>
          {m.status==="LIVE" && <div className="pulse" style={{display:"flex",alignItems:"center",gap:5,background:"rgba(232,23,58,.15)",border:"1px solid rgba(232,23,58,.3)",borderRadius:20,padding:"3px 10px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"var(--red)"}}/>
            <span style={{fontSize:10,color:"var(--red)",fontFamily:"Syne,sans-serif",fontWeight:700,letterSpacing:1}}>LIVE</span>
          </div>}
          {m.status==="TODAY" && <div style={{background:"rgba(245,197,24,.1)",border:"1px solid rgba(245,197,24,.3)",borderRadius:20,padding:"3px 10px",fontSize:10,color:"var(--gold)",fontWeight:600,letterSpacing:1}}>TODAY</div>}
          {m.status==="UPCOMING" && <div style={{background:"rgba(255,255,255,.05)",border:"1px solid var(--border)",borderRadius:20,padding:"3px 10px",fontSize:10,color:"var(--muted)",letterSpacing:1}}>{m.time}</div>}
        </div>
        {/* Teams */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <TeamBlock team={t1} score={m.s1} overs={m.ov1} side="left"/>
          <div style={{flex:1,textAlign:"center"}}>
            <div className="syne" style={{fontSize:11,color:"var(--muted)",letterSpacing:3}}>VS</div>
            {m.crr && <div style={{fontSize:9,color:"var(--muted)",marginTop:4}}>CRR {m.crr} · NRR {m.rrr}</div>}
          </div>
          <TeamBlock team={t2} score={m.s2} overs={m.ov2} side="right"/>
        </div>
        {/* Win prediction bar */}
        {pred && (
          <div style={{marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:10,color:t1.c,fontWeight:600}}>{t1.s} {pred.t1}%</span>
              <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1}}>WIN PREDICTION</span>
              <span style={{fontSize:10,color:t2.c,fontWeight:600}}>{pred.t2}% {t2.s}</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pred.t1}%`,background:`linear-gradient(90deg,${t1.c},${t1.a})`,transition:"width .8s ease",borderRadius:2}}/>
            </div>
          </div>
        )}
        {/* Predict CTA */}
        {m.status==="LIVE" && (
          <div style={{display:"flex",gap:8,marginTop:12}}>
            {[m.t1,m.t2].map(tk=>{
              const t=TEAMS[tk]||{s:tk,c:"#888"};
              const voted_=userPred[m.id]===tk;
              return (
                <button key={tk} className="btn" onClick={e=>{e.stopPropagation();doPredict(m.id,tk);}}
                  style={{flex:1,background:voted_?t.c:"rgba(255,255,255,.05)",border:`1px solid ${voted_?t.c:"var(--border2)"}`,borderRadius:10,padding:"8px",fontSize:11,color:voted_?"#fff":"var(--muted)",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {!isPro&&!voted_&&<span style={{fontSize:9,background:"var(--red)",color:"#fff",borderRadius:3,padding:"1px 5px",letterSpacing:.5}}>PRO</span>}
                  {t.s} will win
                </button>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
          <div style={{fontSize:10,color:"var(--red)",fontWeight:600,letterSpacing:.5}}>ENTER WAR ROOM →</div>
        </div>
      </div>
    );
  };

  const TeamBlock = ({team,score,overs,side}) => (
    <div style={{textAlign:side==="right"?"right":"left",minWidth:90}}>
      <div className="syne" style={{fontSize:22,fontWeight:800,color:team.c,letterSpacing:1}}>{team.s}</div>
      {score ? <>
        <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginTop:2}}>{score}</div>
        <div style={{fontSize:11,color:"var(--muted)"}}>{overs} ov</div>
      </> : <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{overs?"yet to bat":"—"}</div>}
    </div>
  );

  // Plan badge
  const PlanBadge = () => (
    <div style={{display:"flex",alignItems:"center",gap:6,background:isPro?"rgba(245,197,24,.12)":"rgba(255,255,255,.05)",border:`1px solid ${isPro?"rgba(245,197,24,.3)":"var(--border)"}`,borderRadius:20,padding:"4px 10px",cursor:isPro?"default":"pointer"}}
      onClick={()=>!isPro&&setShowUpgrade(true)}>
      <div style={{fontSize:12}}>{isPro?"👑":"🔓"}</div>
      <span style={{fontSize:10,color:isPro?"var(--gold)":"var(--muted)",fontWeight:600,letterSpacing:.5}}>{isPro?"PRO":"FREE"}</span>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // SCREENS
  // ─────────────────────────────────────────────────────────────

  // ── ToS ───────────────────────────────────────────────────────
  if (screen==="tos") return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative"}}>
      <style>{CSS}</style>
      <div className="noise"/>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(232,23,58,.12) 0%,transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:400,width:"100%"}}>
        <div className="glow-in" style={{textAlign:"center",marginBottom:32}}>
          <div className="syne" style={{fontSize:52,fontWeight:800,letterSpacing:2,background:"linear-gradient(135deg,#fff 20%,var(--red) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:.9}}>CRIC<br/>ROAR</div>
          <div style={{fontSize:12,color:"var(--muted)",letterSpacing:3,marginTop:10}}>FAN WAR ROOM</div>
        </div>
        <div className="card" style={{padding:"24px 20px",marginBottom:20}}>
          <div className="syne" style={{fontSize:14,color:"var(--red)",letterSpacing:2,marginBottom:16}}>HOUSE RULES</div>
          {[["⚡","Roast the TEAM, not the human"],["🚫","No slurs, hate speech or threats"],["🤖","AI moderates every message"],["🚩","3 reports = auto-removed"],["⚖️","You own your words (IT Act 2000)"]].map(([i,r])=>(
            <div key={r} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
              <span style={{fontSize:16}}>{i}</span>
              <span style={{fontSize:13,color:"#C0C0D0",lineHeight:1.5}}>{r}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:"var(--muted)",textAlign:"center",marginBottom:16,lineHeight:1.8}}>
          Not affiliated with BCCI or IPL. Fan platform only.<br/>By continuing you agree to our community guidelines.
        </div>
        <button className="btn" onClick={()=>setScreen(user?"main":"tos_name")}
          style={{width:"100%",background:"var(--red)",borderRadius:14,padding:"16px",color:"#fff",fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800,letterSpacing:2,cursor:"pointer"}}>
          I AGREE — LET'S ROAR 🔥
        </button>
      </div>
    </div>
  );

  // ── Name input ────────────────────────────────────────────────
  if (screen==="tos_name"||showName) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative"}}>
      <style>{CSS}</style>
      <div className="noise"/>
      <div style={{position:"relative",zIndex:1,maxWidth:400,width:"100%",textAlign:"center"}}>
        <div className="syne" style={{fontSize:40,fontWeight:800,background:"linear-gradient(135deg,#fff,var(--red))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8}}>YOUR ROAST NAME</div>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:32}}>This is how fans will see you in the war room</div>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&nameInput.trim()&&createUser(nameInput.trim())}
          placeholder="e.g. RCBMacha99" maxLength={20}
          style={{width:"100%",background:"var(--surface)",border:"2px solid var(--border2)",borderRadius:12,padding:"14px 18px",color:"var(--text)",fontSize:18,fontFamily:"Syne,sans-serif",fontWeight:700,textAlign:"center",marginBottom:16}}/>
        <button className="btn" onClick={()=>createUser(nameInput.trim()||undefined)}
          style={{width:"100%",background:"var(--red)",borderRadius:14,padding:"14px",color:"#fff",fontFamily:"Syne,sans-serif",fontSize:15,fontWeight:800,letterSpacing:1,cursor:"pointer"}}>
          ENTER THE WAR ROOM →
        </button>
      </div>
    </div>
  );

  // ── Main (scores + war tabs) ──────────────────────────────────
  if (screen==="main") return (
    <div style={{minHeight:"100vh",background:"var(--bg)",position:"relative"}}>
      <style>{CSS}</style>
      <div className="noise"/>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% -10%,rgba(232,23,58,.08) 0%,transparent 60%)",pointerEvents:"none",zIndex:0}}/>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(9,9,15,.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid var(--border)",padding:"12px 20px"}}>
        <div style={{maxWidth:480,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div className="syne" style={{fontSize:24,fontWeight:800,background:"linear-gradient(135deg,#fff,var(--red))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:1}}>CRICROAR</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{user?.name}</div>
            <PlanBadge/>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 20px 0"}}>
        <div style={{display:"flex",gap:6,background:"var(--surface)",borderRadius:12,padding:4,marginBottom:20}}>
          {[["scores","Live Scores 📊"],["war","War Room ⚔️"]].map(([t,l])=>(
            <button key={t} className={`btn${tab===t?" tab-active":""}`} onClick={()=>setTab(t)}
              style={{flex:1,background:"transparent",borderRadius:9,padding:"9px",fontSize:12,color:tab===t?"#fff":"var(--muted)",fontWeight:600,cursor:"pointer",letterSpacing:.3,transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>

        {/* PAY SUCCESS */}
        {paySuccess && (
          <div className="pop" style={{background:"rgba(245,197,24,.12)",border:"1px solid rgba(245,197,24,.3)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>👑</span>
            <span style={{fontSize:13,color:"var(--gold)",fontWeight:600}}>Welcome to Pro! All features unlocked 🔥</span>
          </div>
        )}

        {/* FREE BANNER */}
        {!isPro && tab==="war" && (
          <div className="card" style={{padding:"12px 16px",marginBottom:16,background:"rgba(232,23,58,.06)",border:"1px solid rgba(232,23,58,.2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:"var(--text)",fontWeight:600}}>Free plan</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>{Math.max(0,roastsLeft)} roasts left today</div>
            </div>
            <button className="btn" onClick={()=>setShowUpgrade(true)}
              style={{background:"var(--red)",border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>
              GO PRO ₹49
            </button>
          </div>
        )}

        {/* SCORES TAB */}
        {tab==="scores" && (
          <div className="up">
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:3,marginBottom:14,fontWeight:600}}>
              {CFG.CRICKET_API==="YOUR_CRICKETDATA_API_KEY"?"DEMO MATCHES":"IPL 2026 MATCHES"}
            </div>
            {matches.map(m=>(
              <ScoreCard key={m.id} m={m} onClick={()=>{ setSelMatch(m.id); setTab("war"); }}/>
            ))}
          </div>
        )}

        {/* WAR TAB — pick match */}
        {tab==="war" && !selMatch && (
          <div className="up">
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:3,marginBottom:14,fontWeight:600}}>PICK A MATCH TO ROAST IN</div>
            {matches.map(m=>{
              const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",g:"#333"};
              const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",g:"#333"};
              return (
                <div key={m.id} className="card btn up" onClick={()=>setSelMatch(m.id)}
                  style={{padding:"16px 20px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                  <div className="syne" style={{fontSize:18,fontWeight:800,color:t1.c}}>{t1.s}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>VS</div>
                  <div className="syne" style={{fontSize:18,fontWeight:800,color:t2.c}}>{t2.s}</div>
                  <div style={{flex:1}}/>
                  {m.status==="LIVE"&&<div className="pulse" style={{width:8,height:8,borderRadius:"50%",background:"var(--red)"}}/>}
                  <div style={{fontSize:11,color:"var(--red)",fontWeight:600}}>→</div>
                </div>
              );
            })}
          </div>
        )}

        {/* WAR TAB — pick side */}
        {tab==="war" && selMatch && !myTeam && match && (
          <div className="up">
            <button className="btn" onClick={()=>setSelMatch(null)} style={{background:"none",border:"none",color:"var(--muted)",fontSize:13,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
              ← back
            </button>
            <div className="syne" style={{fontSize:28,fontWeight:800,textAlign:"center",marginBottom:6}}>PICK YOUR SIDE</div>
            <div style={{fontSize:12,color:"var(--muted)",textAlign:"center",marginBottom:28}}>Your roasts will represent this team</div>
            <div style={{display:"flex",gap:12}}>
              {[match.t1,match.t2].map(tk=>{
                const team=TEAMS[tk]||{s:tk,c:"#888",a:"#fff",g:"#333",n:tk};
                return (
                  <button key={tk} className="btn" onClick={()=>setMyTeam(tk)}
                    style={{flex:1,background:team.g,borderRadius:20,padding:"28px 16px",textAlign:"center",cursor:"pointer",border:"none",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",borderRadius:20}}/>
                    <div style={{position:"relative",zIndex:1}}>
                      <div className="syne" style={{fontSize:36,fontWeight:800,color:"#fff",letterSpacing:1}}>{team.s}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:6,lineHeight:1.4}}>{team.n}</div>
                      <div style={{marginTop:16,background:"rgba(255,255,255,.15)",borderRadius:10,padding:"8px",fontSize:12,color:"#fff",fontWeight:600}}>
                        I'M {team.s} 💀
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* WAR ROOM */}
      {tab==="war"&&selMatch&&myTeam&&match&&MT&&OT&&(
        <WarRoom {...{match,MT,OT,myTeam,oppKey,roasts,input,setInput,send,sending,blocked,doVote,doReport,voted,reported,doAIRoast,aiLoading,toast,topRoaster,meter,myPct,isPro,roastsLeft,chatRef,setShowPaywall,setShowUpgrade,setMyTeam}}/>
      )}

      {/* UPGRADE MODAL */}
      {(showUpgrade||showPaywall)&&(
        <Modal onClose={()=>{setShowUpgrade(false);setShowPaywall(false);}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:40,marginBottom:8}}>👑</div>
            <div className="syne" style={{fontSize:28,fontWeight:800,color:"#fff",marginBottom:6}}>GO PRO</div>
            <div style={{fontSize:13,color:"var(--muted)"}}>
              {showPaywall?"You've used all 3 free roasts today. Upgrade to keep roasting!":"Unlock the full CricRoar experience"}
            </div>
          </div>
          <div style={{marginBottom:24}}>
            {[["⚔️","Unlimited roasts every match","free: 3/day"],["🤖","AI Roast button","free: locked"],["📊","Vote on predictions","free: view only"],["🚫","Zero ads","free: ads shown"],["🏆","Man of the Match badge","free: locked"]].map(([i,f,sub])=>(
              <div key={f} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                <span style={{fontSize:18}}>{i}</span>
                <div>
                  <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{f}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{sub}</div>
                </div>
                <div style={{marginLeft:"auto",fontSize:16}}>✅</div>
              </div>
            ))}
          </div>
          <button className="btn" onClick={buyPro}
            style={{width:"100%",background:"linear-gradient(135deg,var(--red),#FF6600)",borderRadius:14,padding:"16px",color:"#fff",fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,cursor:"pointer",letterSpacing:1}}>
            ₹49 / MONTH — UNLOCK NOW
          </button>
          <div style={{fontSize:10,color:"var(--muted)",textAlign:"center",marginTop:10}}>Cancel anytime · Secure payment via Razorpay</div>
        </Modal>
      )}
    </div>
  );

  return null;
}

// ─────────────────────────────────────────────────────────────
//  WAR ROOM COMPONENT
// ─────────────────────────────────────────────────────────────
function WarRoom({match,MT,OT,myTeam,oppKey,roasts,input,setInput,send,sending,blocked,doVote,doReport,voted,reported,doAIRoast,aiLoading,toast,topRoaster,meter,myPct,isPro,roastsLeft,chatRef,setShowPaywall,setShowUpgrade,setMyTeam}) {
  const visRoasts = roasts.filter(r=>!r.hidden);
  return (
    <div style={{position:"fixed",inset:0,top:0,background:"var(--bg)",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",zIndex:50}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

      {/* War header */}
      <div style={{padding:"10px 16px",background:"rgba(9,9,15,.97)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={()=>setMyTeam(null)} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer"}}>←</button>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="syne" style={{fontSize:16,fontWeight:800,color:MT.c}}>{MT.s}</span>
            <span style={{fontSize:10,color:"var(--muted)"}}>VS</span>
            <span className="syne" style={{fontSize:16,fontWeight:800,color:OT.c}}>{OT.s}</span>
            {match.status==="LIVE"&&<div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"var(--red)",marginLeft:4}}/>}
          </div>
          {(match.s1||match.s2)&&(
            <div style={{fontSize:9,color:"var(--muted)",marginTop:1}}>
              {match.s1&&`${match.t1}: ${match.s1}${match.ov1?` (${match.ov1} ov)`:""}`}
              {match.s1&&match.s2&&" · "}
              {match.s2&&`${match.t2}: ${match.s2}${match.ov2?` (${match.ov2} ov)`:""}`}
            </div>
          )}
        </div>
        <button onClick={isPro?doAIRoast:()=>setShowUpgrade(true)} disabled={aiLoading}
          style={{background:isPro?"rgba(232,23,58,.15)":"rgba(255,255,255,.05)",border:`1px solid ${isPro?"rgba(232,23,58,.3)":"var(--border)"}`,color:isPro?"var(--red)":"var(--muted)",borderRadius:10,padding:"7px 11px",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5,opacity:aiLoading?.5:1,display:"flex",alignItems:"center",gap:5}}>
          {!isPro&&<span style={{fontSize:8,background:"var(--red)",color:"#fff",borderRadius:3,padding:"1px 4px"}}>PRO</span>}
          {aiLoading?"...":"🤖"}
        </button>
      </div>

      {/* War meter */}
      <div style={{padding:"8px 16px",background:"rgba(0,0,0,.5)",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:9,color:MT.c,fontWeight:700,fontFamily:"Syne,sans-serif"}}>{MT.s} {myPct}%</span>
          <span style={{fontSize:9,color:"var(--muted)",letterSpacing:2}}>⚔️ WAR METER</span>
          <span style={{fontSize:9,color:OT.c,fontWeight:700,fontFamily:"Syne,sans-serif"}}>{100-myPct}% {OT.s}</span>
        </div>
        <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${myPct}%`,background:`linear-gradient(90deg,${MT.c},${MT.a})`,transition:"width 1s cubic-bezier(.4,0,.2,1)",borderRadius:2}}/>
        </div>
      </div>

      {/* AI Toast */}
      {toast&&(
        <div style={{margin:"8px 16px 0",background:"linear-gradient(135deg,rgba(232,23,58,.12),rgba(100,0,30,.15))",border:"1px solid rgba(232,23,58,.3)",borderRadius:12,padding:"10px 14px",display:"flex",gap:10,flexShrink:0}}>
          <span style={{fontSize:16}}>🤖</span>
          <div>
            <div style={{fontSize:8,color:"var(--red)",fontWeight:700,letterSpacing:1,marginBottom:3}}>AI JUST ROASTED {OT.s}</div>
            <div style={{fontSize:13,color:"var(--text)",fontWeight:600,lineHeight:1.4}}>{toast}</div>
          </div>
        </div>
      )}

      {/* MOTM */}
      {topRoaster&&(
        <div style={{margin:"6px 16px 0",background:"rgba(245,197,24,.05)",border:"1px solid rgba(245,197,24,.15)",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span>🏆</span>
          <span style={{fontSize:9,color:"var(--gold)",fontWeight:700,letterSpacing:.5}}>MAN OF THE ROAST</span>
          <span style={{fontSize:9,color:"var(--gold)"}}>@{topRoaster.user_name}</span>
          <span style={{fontSize:9,color:"var(--muted)",marginLeft:"auto"}}>{topRoaster.votes||0} 🔥</span>
        </div>
      )}

      {/* Messages */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {visRoasts.map(msg=>{
          const mt=TEAMS[msg.team]||{s:msg.team,c:"#888",a:"#fff"};
          const isMe=msg.team===myTeam;
          return (
            <div key={msg.id} style={{alignSelf:isMe?"flex-end":"flex-start",maxWidth:"86%",animation:"up .3s ease-out"}}>
              <div style={{
                background:msg.isAI?"linear-gradient(135deg,rgba(232,23,58,.1),rgba(80,0,20,.2))":isMe?`${mt.g||mt.c}22`:"var(--surface)",
                border:`1px solid ${isMe?(mt.c+"33"):"var(--border)"}`,
                borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",
                padding:"11px 14px",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:mt.c,flexShrink:0}}/>
                  <span style={{fontSize:10,color:mt.c,fontWeight:700}}>{msg.user_name}</span>
                  {msg.isAI&&<span style={{fontSize:8,background:"rgba(232,23,58,.2)",color:"var(--red)",borderRadius:4,padding:"1px 5px"}}>AI</span>}
                  {isPro&&isMe&&<span style={{fontSize:8,background:"rgba(245,197,24,.2)",color:"var(--gold)",borderRadius:4,padding:"1px 5px",marginLeft:"auto"}}>PRO</span>}
                </div>
                <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5,fontWeight:400}}>{msg.text}</div>
                <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                  {[["🔥",1],["💀",-1]].map(([icon,d])=>(
                    <button key={icon} onClick={()=>doVote(msg.id,d)}
                      style={{background:voted[msg.id]===d?"rgba(232,23,58,.2)":"rgba(255,255,255,.06)",border:`1px solid ${voted[msg.id]===d?"rgba(232,23,58,.4)":"var(--border)"}`,borderRadius:8,padding:"3px 9px",color:voted[msg.id]===d?"var(--red)":"var(--muted)",fontSize:11,cursor:"pointer",opacity:(voted[msg.id]&&voted[msg.id]!==d)?.4:1,transition:"all .15s"}}>
                      {icon}{icon==="🔥"&&(msg.votes||0)>0?` ${msg.votes}`:""}
                    </button>
                  ))}
                  {!isMe&&!msg.isAI&&(
                    <button onClick={()=>doReport(msg.id)}
                      style={{background:"none",border:"none",color:reported[msg.id]?"var(--red)":"var(--border2)",fontSize:12,cursor:"pointer",marginLeft:"auto",padding:"2px 4px"}}>
                      🚩
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {visRoasts.length===0&&(
          <div style={{textAlign:"center",padding:"48px 0",color:"var(--muted)",fontSize:13}}>
            Silence... Be the first to attack 💀
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:"10px 16px 18px",background:"rgba(9,9,15,.97)",borderTop:"1px solid var(--border)",flexShrink:0}}>
        {blocked&&(
          <div style={{background:"rgba(232,23,58,.1)",border:"1px solid rgba(232,23,58,.3)",borderRadius:10,padding:"8px 12px",marginBottom:8,fontSize:11,color:"var(--red)",textAlign:"center",animation:"shake .4s"}}>
            🚫 Blocked — Keep it cricket banter only
          </div>
        )}
        {!isPro&&(
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:10,color:"var(--muted)"}}>{Math.max(0,roastsLeft)} free roasts left today</span>
            <button onClick={()=>setShowUpgrade(true)} style={{background:"none",border:"none",color:"var(--red)",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>UPGRADE →</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:MT?.c,flexShrink:0}}/>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder={`Roast ${OT?.s} fans...`} maxLength={120}
            style={{flex:1,background:"var(--surface2)",border:`1px solid ${blocked?"rgba(232,23,58,.4)":"var(--border2)"}`,borderRadius:12,padding:"11px 14px",color:"var(--text)",fontSize:13,transition:"border .2s",fontFamily:"DM Sans,sans-serif"}}/>
          <button onClick={roastsLeft<=0&&!isPro?()=>setShowPaywall(true):send} disabled={!input.trim()||sending}
            style={{background:input.trim()&&!sending?"var(--red)":"var(--surface2)",border:"none",borderRadius:12,width:44,height:44,color:"#fff",fontSize:18,cursor:input.trim()&&!sending?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>
            {sending?"⏳":"🔥"}
          </button>
        </div>
        <div style={{fontSize:9,color:"#2a2a3a",marginTop:5,textAlign:"center"}}>
          {120-input.length} chars · AI moderated · CricRoar not affiliated with BCCI
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────────────────────────
function Modal({children,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0"}}>
      <div className="pop" style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:"24px 24px 0 0",padding:"28px 24px 36px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.08)",border:"none",borderRadius:"50%",width:32,height:32,color:"var(--muted)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        {children}
      </div>
    </div>
  );
}
