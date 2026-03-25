import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// CRICROAR v3 — Cricbuzz-Inspired Design
// Keys go in Vercel Environment Variables
// ═══════════════════════════════════════════════════════════
const CFG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || "",
  CRICKET_API:  import.meta.env.VITE_CRICKET_API  || "",
  RAZORPAY_KEY: import.meta.env.VITE_RAZORPAY_KEY || "",
  PLAN_AMOUNT:  4900,
};

// ── TEAMS ───────────────────────────────────────────────────
const TEAMS = {
  RCB:  { n:"Royal Challengers Bengaluru", s:"RCB",  c:"#E8002D", a:"#FFD600", g:"135deg,#E8002D,#7B0000" },
  MI:   { n:"Mumbai Indians",              s:"MI",   c:"#004BA0", a:"#29B6F6", g:"135deg,#004BA0,#01285A" },
  CSK:  { n:"Chennai Super Kings",         s:"CSK",  c:"#F7A721", a:"#1565C0", g:"135deg,#F7A721,#E65100" },
  KKR:  { n:"Kolkata Knight Riders",       s:"KKR",  c:"#3A225D", a:"#FFD600", g:"135deg,#3A225D,#2E003E" },
  SRH:  { n:"Sunrisers Hyderabad",         s:"SRH",  c:"#F26522", a:"#FFE57F", g:"135deg,#F26522,#BF360C" },
  DC:   { n:"Delhi Capitals",              s:"DC",   c:"#17479E", a:"#EF1C25", g:"135deg,#17479E,#B71C1C" },
  PBKS: { n:"Punjab Kings",               s:"PBKS", c:"#DD1F2D", a:"#FFD600", g:"135deg,#DD1F2D,#7F0000" },
  GT:   { n:"Gujarat Titans",             s:"GT",   c:"#1C4587", a:"#CFB46A", g:"135deg,#1C4587,#000051" },
  LSG:  { n:"Lucknow Super Giants",       s:"LSG",  c:"#A72B6E", a:"#F9D342", g:"135deg,#A72B6E,#4A0033" },
  RR:   { n:"Rajasthan Royals",           s:"RR",   c:"#254AA5", a:"#F48FB1", g:"135deg,#254AA5,#001064" },
};

const resolveTeam = (name) => {
  if (!name) return null;
  const u = name.toUpperCase();
  return Object.keys(TEAMS).find(k => u.includes(k) || TEAMS[k].n.toUpperCase().split(" ").some(w => w.length > 3 && u.includes(w))) || null;
};

// ── DEMO DATA ───────────────────────────────────────────────
const DEMO_MATCHES = [
  { id:"m1", t1:"RCB", t2:"MI",  status:"LIVE",     time:"7:30 PM", venue:"M.Chinnaswamy Stadium", s1:"167/5", ov1:"20", s2:"142/8", ov2:"18.4", crr:"7.71", target:"168" },
  { id:"m2", t1:"CSK", t2:"KKR", status:"TODAY",    time:"3:30 PM", venue:"MA Chidambaram Stadium", s1:null, ov1:null, s2:null, ov2:null },
  { id:"m3", t1:"SRH", t2:"DC",  status:"UPCOMING", time:"Mar 27 • 7:30 PM", venue:"Rajiv Gandhi Intl. Stadium", s1:null, ov1:null, s2:null, ov2:null },
];

const DEMO_MSGS = [
  { id:1, match_id:"m1", uid:"u1", uname:"RCBMacha",     team:"RCB", text:"MI ko aaj bhi 25 runs chahiye 2 overs mein 😈 same story every year", votes:47, reports:0, hidden:false, ts:Date.now()-300000 },
  { id:2, match_id:"m1", uid:"u2", uname:"BombayKing",   team:"MI",  text:"RCB ke trophies ginte ginte haath thak gaye... kyunki 0 hain 💀", votes:89, reports:0, hidden:false, ts:Date.now()-240000 },
  { id:3, match_id:"m1", uid:"u3", uname:"KohliArmy77",  team:"RCB", text:"Kohli ne 72 maare aaj. Usse koi rok hi nahi sakta 🔥", votes:54, reports:0, hidden:false, ts:Date.now()-180000 },
  { id:4, match_id:"m1", uid:"u4", uname:"PaltanForever",team:"MI",  text:"5 baar champion bane hain hum. RCB ke supporters ke sapne mein bhi trophy nahi aati 🏆", votes:102, reports:0, hidden:false, ts:Date.now()-120000 },
];

// ── SUPABASE ────────────────────────────────────────────────
function makeSB(url, key) {
  const h = { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" };
  const q = (p, o={}) => fetch(`${url}/rest/v1/${p}`, { headers:h, ...o }).then(r=>r.ok?r.json():[]).catch(()=>[]);
  return {
    getUser:    (id)    => q(`users?id=eq.${id}`).then(r=>r[0]||null),
    upsertUser: (u)     => q(`users`, { method:"POST", headers:{...h,Prefer:"resolution=merge-duplicates,return=representation"}, body:JSON.stringify(u) }),
    getRoasts:  (mid)   => q(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=120`),
    postRoast:  (m)     => q(`roasts`, { method:"POST", body:JSON.stringify(m) }),
    patchVotes: (id,v)  => q(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({votes:v}) }),
    patchReport:(id,r,h2)=>q(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({reports:r,hidden:h2}) }),
    getPreds:   (mid)   => q(`predictions?match_id=eq.${mid}`),
    postPred:   (p)     => q(`predictions`, { method:"POST", headers:{...h,Prefer:"resolution=ignore-duplicates"}, body:JSON.stringify(p) }),
    poll:       (mid,cb)=> { const t=setInterval(()=>q(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=120`).then(cb),4000); return ()=>clearInterval(t); },
    signInGoogle: async () => {
      window.location.href = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
    },
    getSession: async () => {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const token = params.get("access_token");
        if (token) {
          const r = await fetch(`${url}/auth/v1/user`, { headers:{ apikey:key, Authorization:`Bearer ${token}` } });
          const user = await r.json();
          localStorage.setItem("cr_token", token);
          return { token, user };
        }
      }
      const stored = localStorage.getItem("cr_token");
      if (stored) {
        try {
          const r = await fetch(`${url}/auth/v1/user`, { headers:{ apikey:key, Authorization:`Bearer ${stored}` } });
          if (r.ok) { const user = await r.json(); return { token:stored, user }; }
        } catch {}
      }
      return null;
    }
  };
}

// ── AI MODERATE ─────────────────────────────────────────────
async function moderate(text) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:10,
        messages:[{role:"user",content:`Cricket banter moderation. Reply SAFE or BLOCK.\nBLOCK: hate speech, casteism, slurs, threats, sexual content.\nSAFE: team rivalry, cricket jokes, player performance banter.\nMessage: "${text}"`}]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text?.trim().toUpperCase().startsWith("B") ? "BLOCK" : "SAFE";
  } catch { return "SAFE"; }
}

// ── AI ROAST ────────────────────────────────────────────────
async function genRoast(team) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:80,
        messages:[{role:"user",content:`Savage cricket roast. ONE line max 12 words targeting ${TEAMS[team]?.n||team} fans. Pure banter, no slurs. Hindi/English mix ok. Just the roast.`}]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text?.trim()||null;
  } catch { return null; }
}

// ── LIVE SCORES ─────────────────────────────────────────────
async function fetchScores() {
  if (!CFG.CRICKET_API) return null;
  try {
    const r = await fetch(`https://api.cricketdata.org/cricket/?apikey=${CFG.CRICKET_API}&offset=0`);
    const d = await r.json();
    if (d.status !== "success") return null;
    return (d.data||[]).filter(m=>(m.name||"").toLowerCase().includes("ipl")).slice(0,6).map(m=>({
      id:m.id, t1:resolveTeam(m.teams?.[0])||m.teams?.[0], t2:resolveTeam(m.teams?.[1])||m.teams?.[1],
      status: m.matchStarted&&!m.matchEnded?"LIVE":m.matchEnded?"ENDED":"UPCOMING",
      time:m.date||"", venue:m.venue||"",
      s1:m.score?.[0]?`${m.score[0].r}/${m.score[0].w}`:null, ov1:m.score?.[0]?.o||null,
      s2:m.score?.[1]?`${m.score[1].r}/${m.score[1].w}`:null, ov2:m.score?.[1]?.o||null,
    }));
  } catch { return null; }
}

// ── RAZORPAY ────────────────────────────────────────────────
function payRazorpay(userId, userName, onSuccess) {
  if (!CFG.RAZORPAY_KEY) { onSuccess({ demo:true }); return; }
  if (!window.Razorpay) { alert("Payment loading, try again"); return; }
  new window.Razorpay({
    key: CFG.RAZORPAY_KEY, amount: CFG.PLAN_AMOUNT, currency:"INR",
    name:"CricRoar", description:"Pro Plan — 1 Month",
    handler: onSuccess,
    prefill:{ name:userName },
    theme:{ color:"#E8002D" }
  }).open();
}

const uid = ()=>`u_${Math.random().toString(36).slice(2,10)}`;
const today = ()=>new Date().toISOString().slice(0,10);
const timeAgo = (ts) => { const s=Math.floor((Date.now()-ts)/1000); if(s<60)return "now"; if(s<3600)return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`; };
const FREE_LIMIT = 3;

// ════════════════════════════════════════════════════════════
// GLOBAL STYLES — Cricbuzz-Inspired Dark Theme
// ════════════════════════════════════════════════════════════
const G = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Bebas+Neue&display=swap');
:root {
  --bg: #0A0A0F;
  --card: #13131A;
  --card2: #1A1A24;
  --card3: #22222E;
  --border: rgba(255,255,255,.07);
  --border2: rgba(255,255,255,.12);
  --t1: #FFFFFF;
  --t2: #B0B0C8;
  --t3: #606078;
  --accent: #E8002D;
  --accent2: #FF3355;
  --gold: #FFB800;
  --green: #00C853;
  --r: 12px;
  --r2: 8px;
  --r3: 18px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; background: var(--bg); overscroll-behavior: none; }
body { color: var(--t1); font-family: 'Nunito', sans-serif; font-size: 14px; line-height: 1.5; }
::-webkit-scrollbar { width: 0; }
.btn { transition: all .15s ease; cursor: pointer; border: none; outline: none; -webkit-user-select: none; user-select: none; }
.btn:active { transform: scale(.96); opacity: .85; }
input, textarea { font-family: 'Nunito', sans-serif; }
input:focus, textarea:focus { outline: none; }
input::placeholder, textarea::placeholder { color: var(--t3); }
.bb { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }

@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn { from { opacity:0; transform:scale(.94); } to { opacity:1; transform:scale(1); } }
@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
@keyframes liveDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.5} }
@keyframes ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }

.fu { animation: fadeUp .3s ease both; }
.fi { animation: fadeIn .25s ease both; }
.si { animation: scaleIn .3s ease both; }
.su { animation: slideUp .35s cubic-bezier(.4,0,.2,1) both; }
.pulse { animation: pulse 2s infinite; }
.shake { animation: shake .35s; }
.spin { animation: spin .9s linear infinite; }
`;

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function CricRoar() {
  const [page, setPage]           = useState("splash");
  const [tab, setTab]             = useState("scores");
  const [user, setUser]           = useState(null);
  const [matches, setMatches]     = useState(DEMO_MATCHES);
  const [selMatch, setSelMatch]   = useState(null);
  const [myTeam, setMyTeam]       = useState(null);
  const [roasts, setRoasts]       = useState([]);
  const [preds, setPreds]         = useState({});
  const [userPred, setUserPred]   = useState({});
  const [input, setInput]         = useState("");
  const [meter, setMeter]         = useState(50);
  const [sending, setSending]     = useState(false);
  const [blocked, setBlocked]     = useState(false);
  const [aiLoad, setAiLoad]       = useState(false);
  const [aiToast, setAiToast]     = useState(null);
  const [voted, setVoted]         = useState({});
  const [reported, setReported]   = useState({});
  const [showPro, setShowPro]     = useState(false);
  const [paidOk, setPaidOk]       = useState(false);
  const [nameVal, setNameVal]     = useState("");
  const [nameStep, setNameStep]   = useState(false);
  const [authErr, setAuthErr]     = useState("");
  const chatRef = useRef(null);
  const sbRef   = useRef(CFG.SUPABASE_URL ? makeSB(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null);
  const sb      = sbRef.current;
  const isDemo  = !sb;

  const match    = matches.find(m=>m.id===selMatch);
  const T1       = match?(TEAMS[match.t1]||{s:match.t1,c:"#888",a:"#fff",g:"135deg,#333,#111",n:match.t1}):null;
  const T2       = match?(TEAMS[match.t2]||{s:match.t2,c:"#888",a:"#fff",g:"135deg,#333,#111",n:match.t2}):null;
  const MT       = myTeam?(TEAMS[myTeam]||{s:myTeam,c:"#888",a:"#fff",g:"135deg,#333,#111"}):null;
  const OT       = myTeam&&match?(myTeam===match.t1?T2:T1):null;
  const oppKey   = myTeam&&match?(myTeam===match.t1?match.t2:match.t1):null;
  const topR     = [...roasts].sort((a,b)=>(b.votes||0)-(a.votes||0))[0];
  const isPro    = user?.plan==="pro";
  const roastsLeft = isPro?999:FREE_LIMIT-(user?.last_roast_date===today()?(user?.roasts_today||0):0);
  const myPct    = Math.round(meter);

  // Init
  useEffect(()=>{
    setTimeout(()=>{
      const stored = localStorage.getItem("cr_user");
      if (stored) { try{ const u=JSON.parse(stored); setUser(u); setPage("main"); return; }catch{} }
      if (sb) {
        sb.getSession().then(sess=>{
          if (sess?.user) {
            const u = { id:sess.user.id, name:sess.user.user_metadata?.full_name||sess.user.email?.split("@")[0]||"Fan", plan:"free", roasts_today:0, last_roast_date:"", avatar:sess.user.user_metadata?.avatar_url||null };
            localStorage.setItem("cr_user", JSON.stringify(u));
            setUser(u); setPage("main");
            sb.upsertUser(u);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else { setPage("login"); }
        });
      } else { setPage("login"); }
    }, 2000);
  },[]);

  // Live scores
  useEffect(()=>{
    if (!CFG.CRICKET_API) return;
    fetchScores().then(d=>{ if(d?.length) setMatches(d); });
    const t=setInterval(()=>fetchScores().then(d=>{ if(d?.length) setMatches(d); }),30000);
    return ()=>clearInterval(t);
  },[]);

  // Roasts
  useEffect(()=>{
    if (!selMatch) return;
    if (isDemo) { setRoasts(DEMO_MSGS); return; }
    sb.getRoasts(selMatch).then(setRoasts);
    return sb.poll(selMatch, setRoasts);
  },[selMatch,isDemo]);

  // Predictions
  useEffect(()=>{
    if (!selMatch||isDemo) return;
    sb.getPreds(selMatch).then(rows=>{
      if (!rows.length) return;
      const c={};
      rows.forEach(r=>{ c[r.team]=(c[r.team]||0)+1; });
      const tot=Object.values(c).reduce((a,b)=>a+b,0);
      if (tot>0) {
        const t1p=Math.round(((c[match?.t1]||0)/tot)*100);
        setPreds(p=>({...p,[selMatch]:{t1:t1p,t2:100-t1p}}));
      }
    });
  },[selMatch]);

  // Scroll
  useEffect(()=>{ chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:"smooth"}); },[roasts]);

  // Meter drift
  useEffect(()=>{
    if (page!=="main") return;
    const t=setInterval(()=>setMeter(p=>Math.max(20,Math.min(80,p+(Math.random()-.5)*4))),3000);
    return ()=>clearInterval(t);
  },[page]);

  // Razorpay script
  useEffect(()=>{
    if (document.getElementById("rzp")) return;
    const s=document.createElement("script");
    s.id="rzp"; s.src="https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(s);
  },[]);

  // ── Actions ────────────────────────────────────────────────
  const loginGuest = () => {
    if (!nameVal.trim()) return;
    const u={ id:uid(), name:nameVal.trim(), plan:"free", roasts_today:0, last_roast_date:"", avatar:null };
    localStorage.setItem("cr_user", JSON.stringify(u));
    setUser(u); setPage("main");
    if (!isDemo) sb.upsertUser(u);
  };

  const loginGoogle = () => {
    if (isDemo) { setNameStep(true); return; }
    setAuthErr("");
    sb.signInGoogle();
  };

  const send = async () => {
    if (!input.trim()||!myTeam||!selMatch||sending) return;
    if (!isPro&&roastsLeft<=0) { setShowPro(true); return; }
    setSending(true); setBlocked(false);
    const v = await moderate(input.trim());
    if (v==="BLOCK") { setBlocked(true); setSending(false); setTimeout(()=>setBlocked(false),3000); return; }
    const msg={ match_id:selMatch, uid:user?.id||"anon", uname:user?.name||"Fan", team:myTeam, text:input.trim(), votes:0, reports:0, hidden:false, ts:Date.now() };
    setInput("");
    setRoasts(p=>[...p,{...msg,id:"p_"+Date.now()}]);
    if (!isDemo) sb.postRoast({ match_id:msg.match_id, user_id:msg.uid, user_name:msg.uname, team:msg.team, text:msg.text, votes:0, reports:0, hidden:false });
    if (!isPro&&user) {
      const isNew=user.last_roast_date!==today();
      const nu={...user,roasts_today:isNew?1:(user.roasts_today||0)+1,last_roast_date:today()};
      setUser(nu); localStorage.setItem("cr_user",JSON.stringify(nu));
      if (!isDemo) sb.upsertUser(nu);
    }
    setMeter(p=>myTeam===match?.t1?Math.min(80,p+4):Math.max(20,p-4));
    setSending(false);
  };

  const doVote = (id,d)=>{
    if (voted[id]) return;
    setVoted(p=>({...p,[id]:d}));
    setRoasts(p=>p.map(m=>m.id===id?{...m,votes:(m.votes||0)+d}:m));
    if (!isDemo){ const m=roasts.find(x=>x.id===id); if(m) sb.patchVotes(id,(m.votes||0)+d); }
  };

  const doReport = (id)=>{
    if (reported[id]) return;
    setReported(p=>({...p,[id]:true}));
    setRoasts(p=>p.map(m=>{ if(m.id!==id)return m; const nr=(m.reports||0)+1; return {...m,reports:nr,hidden:nr>=3}; }));
    if (!isDemo){ const m=roasts.find(x=>x.id===id); if(m) sb.patchReport(id,(m.reports||0)+1,(m.reports||0)+1>=3); }
  };

  const doAI = async()=>{
    if (!isPro){ setShowPro(true); return; }
    if (!oppKey) return;
    setAiLoad(true);
    const r=await genRoast(oppKey);
    if (r) {
      setRoasts(p=>[...p,{id:"ai_"+Date.now(),match_id:selMatch,uid:"bot",uname:"RoastBot AI 🤖",team:myTeam,text:r,votes:0,reports:0,hidden:false,ts:Date.now(),isAI:true}]);
      setAiToast(r); setTimeout(()=>setAiToast(null),5000);
    }
    setAiLoad(false);
  };

  const doPredict=(mid,team)=>{
    if (!isPro){ setShowPro(true); return; }
    if (userPred[mid]) return;
    setUserPred(p=>({...p,[mid]:team}));
    setPreds(p=>{ const m=matches.find(x=>x.id===mid); const c=p[mid]||{t1:50,t2:50}; const isT1=team===m?.t1; return {...p,[mid]:{t1:isT1?Math.min(88,c.t1+5):Math.max(12,c.t1-5),t2:0}} }).valueOf();
    setPreds(p=>{ const v=p[mid]; return {...p,[mid]:{...v,t2:100-v.t1}}; });
    if (!isDemo&&user) sb.postPred({match_id:mid,user_id:user.id,team,value:1});
  };

  const buyPro=()=>{
    payRazorpay(user?.id,user?.name,()=>{
      const nu={...user,plan:"pro"};
      setUser(nu); localStorage.setItem("cr_user",JSON.stringify(nu));
      if(!isDemo&&user) sb.upsertUser(nu);
      setShowPro(false); setPaidOk(true); setTimeout(()=>setPaidOk(false),4000);
    });
  };

  // ════════════════════════════════════════════════════════════
  // SPLASH SCREEN
  // ════════════════════════════════════════════════════════════
  if (page==="splash") return (
    <div style={{height:"100vh",background:"#08080D",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      {/* Background orb */}
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,0,45,.18) 0%,transparent 70%)",top:"50%",left:"50%",transform:"translate(-50%,-50%)",filter:"blur(60px)"}}/>
      {/* Grid lines */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)",backgroundSize:"32px 32px",opacity:.5}}/>
      <div className="fi" style={{textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{width:80,height:80,borderRadius:20,background:"linear-gradient(135deg,#E8002D,#FF6B35)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36,boxShadow:"0 0 40px rgba(232,0,45,.4)"}}>🏏</div>
        <div className="bb" style={{fontSize:52,color:"#fff",lineHeight:1,marginBottom:6}}>CRIC<span style={{color:"#E8002D"}}>ROAR</span></div>
        <div style={{fontSize:11,color:"var(--t3)",letterSpacing:4,textTransform:"uppercase",marginBottom:28}}>Fan War Room · IPL 2026</div>
        {/* Loading bar */}
        <div style={{width:120,height:2,background:"rgba(255,255,255,.08)",borderRadius:2,margin:"0 auto",overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#E8002D,#FF6B35)",borderRadius:2,animation:"ticker 1.5s ease infinite",width:"40%"}}/>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // LOGIN PAGE — Cricbuzz-style with proper auth
  // ════════════════════════════════════════════════════════════
  if (page==="login") return (
    <div style={{minHeight:"100vh",background:"#08080D",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <style>{G}</style>

      {/* BG effects */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:300,background:"linear-gradient(180deg,rgba(232,0,45,.12) 0%,transparent 100%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>

      {/* Top strip — like Cricbuzz */}
      <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,position:"relative",zIndex:1}}>
        <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#E8002D,#FF6B35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏏</div>
        <div className="bb" style={{fontSize:22,color:"#fff"}}>CRIC<span style={{color:"#E8002D"}}>ROAR</span></div>
        <div style={{marginLeft:"auto",fontSize:10,color:"var(--t3)",background:"var(--card)",border:"1px solid var(--border)",borderRadius:6,padding:"3px 8px",fontWeight:700,letterSpacing:.5}}>IPL 2026</div>
      </div>

      {/* Hero section */}
      {!nameStep && (
        <div style={{flex:1,padding:"20px 20px 0",position:"relative",zIndex:1}}>
          {/* Hero matchcard style preview */}
          <div className="fu" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",marginBottom:24}}>
            <div style={{background:"linear-gradient(135deg,rgba(232,0,45,.15),rgba(0,75,160,.15))",padding:"20px 20px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:10,color:"var(--t3)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Featured Match</div>
                <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(232,0,45,.15)",border:"1px solid rgba(232,0,45,.25)",borderRadius:20,padding:"3px 10px"}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:"#E8002D",animation:"liveDot 1.2s infinite"}}/>
                  <span style={{fontSize:9,color:"#E8002D",fontWeight:800,letterSpacing:1.5}}>LIVE</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#E8002D,#7B0000)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:11,fontWeight:800,color:"#fff"}}>RCB</div>
                  <div className="bb" style={{fontSize:26,color:"#E8002D"}}>167/5</div>
                  <div style={{fontSize:10,color:"var(--t3)"}}>(20 ov)</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:"var(--t3)",letterSpacing:2,marginBottom:4}}>VS</div>
                  <div style={{fontSize:10,color:"var(--t2)",fontWeight:700}}>Target 168</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#004BA0,#01285A)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:11,fontWeight:800,color:"#fff"}}>MI</div>
                  <div className="bb" style={{fontSize:26,color:"#004BA0"}}>142/8</div>
                  <div style={{fontSize:10,color:"var(--t3)"}}>(18.4 ov)</div>
                </div>
              </div>
            </div>
            <div style={{padding:"10px 20px",background:"rgba(0,0,0,.2)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:10,color:"var(--t3)"}}>📍 M.Chinnaswamy Stadium</div>
              <div style={{fontSize:10,color:"#E8002D",fontWeight:700}}>War Room →</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:8,marginBottom:28}}>
            {[["🔥","14K+","Roasts Today"],["⚔️","3","Live Wars"],["🏆","IPL","2026"]].map(([ic,v,l])=>(
              <div key={l} className="fu" style={{flex:1,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 8px",textAlign:"center",animationDelay:".05s"}}>
                <div style={{fontSize:18,marginBottom:2}}>{ic}</div>
                <div className="bb" style={{fontSize:18,color:"var(--accent)",lineHeight:1}}>{v}</div>
                <div style={{fontSize:9,color:"var(--t3)",marginTop:2,letterSpacing:.5,textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Auth section */}
          <div className="fu" style={{animationDelay:".1s"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4,lineHeight:1.2}}>Join the <span style={{color:"#E8002D"}}>War Room</span></div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:20,fontWeight:600}}>Roast. Battle. Win the internet. 💀</div>

            {authErr && (
              <div className="shake fu" style={{background:"rgba(232,0,45,.1)",border:"1px solid rgba(232,0,45,.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#FF5577",lineHeight:1.5}}>
                ⚠️ {authErr}
              </div>
            )}

            {/* Google Sign In */}
            <button className="btn" onClick={loginGoogle}
              style={{width:"100%",background:"#fff",borderRadius:12,padding:"14px 20px",color:"#1a1a1a",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
              <span style={{fontSize:11,color:"var(--t3)",fontWeight:600}}>OR</span>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
            </div>

            {/* Guest */}
            <button className="btn" onClick={()=>setNameStep(true)}
              style={{width:"100%",background:"var(--card)",border:"1px solid var(--border2)",borderRadius:12,padding:"14px 20px",color:"var(--t2)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              👤 Continue as Guest
            </button>

            <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",marginTop:16,lineHeight:1.8,paddingBottom:20}}>
              Not affiliated with BCCI or IPL · Fan platform only<br/>
              By continuing you agree to keep it cricket banter 🏏
            </div>
          </div>
        </div>
      )}

      {/* Guest name step */}
      {nameStep && (
        <div className="fu" style={{flex:1,padding:"32px 20px",position:"relative",zIndex:1,display:"flex",flexDirection:"column"}}>
          <button className="btn" onClick={()=>setNameStep(false)} style={{background:"none",border:"none",color:"var(--t3)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:28,padding:0}}>
            ← Back
          </button>
          <div style={{fontSize:11,color:"var(--accent)",fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Choose Your Roast Name</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:24,lineHeight:1.2}}>What should your<br/>fans call you? 🔥</div>
          <input
            value={nameVal}
            onChange={e=>setNameVal(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&nameVal.trim()&&loginGuest()}
            placeholder="e.g. RCBMacha99"
            maxLength={20}
            autoFocus
            style={{
              width:"100%",
              background:"var(--card)",
              border:"2px solid var(--border2)",
              borderRadius:12,
              padding:"16px 18px",
              color:"var(--t1)",
              fontSize:20,
              fontWeight:800,
              textAlign:"center",
              marginBottom:16,
              letterSpacing:1,
            }}
          />
          <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",marginBottom:20}}>{nameVal.length}/20 chars · No spaces please</div>
          <button className="btn" onClick={loginGuest} disabled={!nameVal.trim()}
            style={{
              width:"100%",
              background:nameVal.trim()?"linear-gradient(135deg,var(--accent),#FF6B35)":"var(--card3)",
              borderRadius:12,
              padding:"16px",
              color:"#fff",
              fontSize:15,
              fontWeight:800,
              cursor:nameVal.trim()?"pointer":"default",
              letterSpacing:.5,
              boxShadow:nameVal.trim()?"0 4px 20px rgba(232,0,45,.3)":"none"
            }}>
            Enter War Room →
          </button>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════════════
  if (page==="main") return (
    <div style={{height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",position:"relative",maxWidth:480,margin:"0 auto"}}>
      <style>{G}</style>

      {/* Header — Cricbuzz style */}
      <div style={{
        padding:"0",
        background:"#0D0D14",
        borderBottom:"1px solid var(--border)",
        flexShrink:0,
        backdropFilter:"blur(20px)",
      }}>
        {/* Main header row */}
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#E8002D,#FF6B35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏏</div>
            <div className="bb" style={{fontSize:20,color:"#fff",letterSpacing:1}}>CRIC<span style={{color:"#E8002D"}}>ROAR</span></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {paidOk&&<div className="fu" style={{fontSize:10,color:"var(--gold)",fontWeight:800,background:"rgba(255,184,0,.1)",border:"1px solid rgba(255,184,0,.2)",borderRadius:16,padding:"3px 10px"}}>👑 PRO!</div>}
            <div onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 10px 5px 5px"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:isPro?"linear-gradient(135deg,var(--gold),#ff9800)":"linear-gradient(135deg,var(--accent),#ff6b6b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,overflow:"hidden"}}>
                {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:800,lineHeight:1,color:"#fff"}}>{user?.name?.split(" ")[0]}</div>
                <div style={{fontSize:8,color:isPro?"var(--gold)":"var(--t3)",letterSpacing:.5,textTransform:"uppercase",fontWeight:700}}>{isPro?"PRO ★":"FREE"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar — Cricbuzz style pill tabs */}
        <div style={{display:"flex",padding:"0 16px 10px",gap:6}}>
          {[["scores","📊","Scores"],["war","⚔️","War Room"],["profile","👤","Profile"]].map(([t,ic,lb])=>(
            <button key={t} className="btn" onClick={()=>setTab(t)}
              style={{
                flex:1,
                background:tab===t?"var(--accent)":"var(--card)",
                border:`1px solid ${tab===t?"var(--accent)":"var(--border)"}`,
                borderRadius:20,
                padding:"7px 4px",
                color:tab===t?"#fff":"var(--t3)",
                fontSize:10,
                fontWeight:800,
                letterSpacing:.3,
                cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                transition:"all .2s",
              }}>
              <span style={{fontSize:12}}>{ic}</span>{lb}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:tab==="war"&&selMatch&&myTeam?"hidden":"auto",position:"relative"}}>
        {tab==="scores"  && <ScoresTab matches={matches} preds={preds} userPred={userPred} isPro={isPro} onMatchClick={(id)=>{setSelMatch(id);setTab("war");}} doPredict={doPredict} setShowPro={setShowPro}/>}
        {tab==="war"     && <WarTab match={match} selMatch={selMatch} myTeam={myTeam} setMyTeam={setMyTeam} setSelMatch={setSelMatch} matches={matches} T1={T1} T2={T2} MT={MT} OT={OT} oppKey={oppKey} roasts={roasts} input={input} setInput={setInput} send={send} sending={sending} blocked={blocked} doVote={doVote} doReport={doReport} voted={voted} reported={reported} doAI={doAI} aiLoad={aiLoad} aiToast={aiToast} topR={topR} meter={meter} myPct={myPct} isPro={isPro} roastsLeft={roastsLeft} chatRef={chatRef} setShowPro={setShowPro}/>}
        {tab==="profile" && <ProfileTab user={user} isPro={isPro} setShowPro={setShowPro} onLogout={()=>{ localStorage.removeItem("cr_user"); localStorage.removeItem("cr_token"); setUser(null); setPage("login"); }}/>}
      </div>

      {/* Pro Modal */}
      {showPro && <ProModal isPro={isPro} onBuy={buyPro} onClose={()=>setShowPro(false)}/>}
    </div>
  );

  return null;
}

// ════════════════════════════════════════════════════════════
// SCORES TAB — Cricbuzz card style
// ════════════════════════════════════════════════════════════
function ScoresTab({matches,preds,userPred,isPro,onMatchClick,doPredict,setShowPro}) {
  return (
    <div style={{padding:"12px 12px 24px"}}>
      {/* Section header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"0 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:16,background:"var(--accent)",borderRadius:2}}/>
          <span style={{fontSize:12,fontWeight:800,color:"#fff",letterSpacing:.5}}>IPL 2026 Matches</span>
        </div>
        <div style={{fontSize:9,color:"var(--t3)",fontWeight:700}}>Auto-refresh 30s</div>
      </div>
      {matches.map((m,i)=><MatchCard key={m.id} m={m} pred={preds[m.id]} voted={userPred[m.id]} isPro={isPro} delay={i*.07} onClick={()=>onMatchClick(m.id)} doPredict={doPredict} setShowPro={setShowPro}/>)}
    </div>
  );
}

function MatchCard({m,pred,voted,isPro,delay,onClick,doPredict,setShowPro}) {
  const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",a:"#fff",g:"135deg,#333,#111"};
  const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",a:"#fff",g:"135deg,#333,#111"};
  const isLive = m.status==="LIVE";
  return (
    <div className="fu btn" onClick={onClick} style={{
      background:"var(--card)",
      border:`1px solid ${isLive?"rgba(232,0,45,.3)":"var(--border)"}`,
      borderRadius:14,
      marginBottom:10,
      overflow:"hidden",
      cursor:"pointer",
      animationDelay:`${delay}s`,
      position:"relative",
      boxShadow:isLive?"0 0 0 1px rgba(232,0,45,.1), 0 4px 20px rgba(232,0,45,.08)":"none",
    }}>
      {/* Top color bar */}
      <div style={{height:2,background:`linear-gradient(90deg,${t1.c} 50%,${t2.c} 50%)`}}/>

      {/* Status bar */}
      <div style={{padding:"8px 14px",background:isLive?"rgba(232,0,45,.06)":"rgba(255,255,255,.02)",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)"}}>
        <div style={{fontSize:9,color:"var(--t3)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
          <span>📍</span><span>{m.venue}</span>
        </div>
        {isLive && (
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(232,0,45,.12)",border:"1px solid rgba(232,0,45,.2)",borderRadius:16,padding:"2px 8px"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#E8002D",animation:"liveDot 1.2s infinite"}}/>
            <span style={{fontSize:8,color:"#E8002D",fontWeight:800,letterSpacing:1.5}}>LIVE</span>
          </div>
        )}
        {m.status==="TODAY" && <div style={{background:"rgba(255,184,0,.1)",border:"1px solid rgba(255,184,0,.2)",borderRadius:16,padding:"2px 8px",fontSize:8,color:"var(--gold)",fontWeight:800,letterSpacing:1.5}}>TODAY {m.time}</div>}
        {m.status==="UPCOMING" && <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:16,padding:"2px 8px",fontSize:8,color:"var(--t3)",fontWeight:700}}>🗓 {m.time}</div>}
      </div>

      {/* Teams + Scores */}
      <div style={{padding:"14px 14px 12px"}}>
        {/* Team row 1 */}
        <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(${t1.g})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 2px 8px ${t1.c}40`}}>{t1.s?.slice(0,2)}</div>
            <div>
              <div className="bb" style={{fontSize:18,color:t1.c,lineHeight:1,letterSpacing:.5}}>{t1.s}</div>
              <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>{t1.n?.split(" ").slice(-1)[0]}</div>
            </div>
          </div>
          {m.s1 ? (
            <div style={{textAlign:"right"}}>
              <div className="bb" style={{fontSize:22,color:"#fff",lineHeight:1}}>{m.s1}</div>
              <div style={{fontSize:9,color:"var(--t3)"}}>{m.ov1} ov</div>
            </div>
          ) : <div style={{fontSize:12,color:"var(--t3)"}}>—</div>}
        </div>

        {/* Divider with VS */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
          <div style={{fontSize:9,color:"var(--t3)",fontWeight:700,letterSpacing:2}}>VS</div>
          {m.target&&<div style={{fontSize:9,color:"var(--t2)",fontWeight:700}}>T: {m.target}</div>}
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
        </div>

        {/* Team row 2 */}
        <div style={{display:"flex",alignItems:"center",marginBottom:pred||isLive?12:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(${t2.g})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 2px 8px ${t2.c}40`}}>{t2.s?.slice(0,2)}</div>
            <div>
              <div className="bb" style={{fontSize:18,color:t2.c,lineHeight:1,letterSpacing:.5}}>{t2.s}</div>
              <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>{t2.n?.split(" ").slice(-1)[0]}</div>
            </div>
          </div>
          {m.s2 ? (
            <div style={{textAlign:"right"}}>
              <div className="bb" style={{fontSize:22,color:"#fff",lineHeight:1}}>{m.s2}</div>
              <div style={{fontSize:9,color:"var(--t3)"}}>{m.ov2} ov</div>
            </div>
          ) : <div style={{fontSize:12,color:"var(--t3)"}}>—</div>}
        </div>

        {/* Fan Prediction bar */}
        {pred && (
          <div style={{marginBottom:isLive?10:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:9,color:t1.c,fontWeight:800}}>{t1.s} {pred.t1}%</span>
              <span style={{fontSize:8,color:"var(--t3)",letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>Fan Pick</span>
              <span style={{fontSize:9,color:t2.c,fontWeight:800}}>{pred.t2}% {t2.s}</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"var(--card3)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pred.t1}%`,background:`linear-gradient(90deg,${t1.c},${t1.a})`,transition:"width .8s ease",borderRadius:2}}/>
            </div>
          </div>
        )}

        {/* Predict buttons */}
        {isLive && (
          <div style={{display:"flex",gap:8}}>
            {[m.t1,m.t2].map(tk=>{
              const t=TEAMS[tk]||{s:tk,c:"#888",g:"135deg,#333,#111"};
              const isV=voted===tk;
              return (
                <button key={tk} className="btn" onClick={e=>{e.stopPropagation();doPredict(m.id,tk);}}
                  style={{
                    flex:1,
                    background:isV?`linear-gradient(${t.g})`:"var(--card2)",
                    border:`1px solid ${isV?t.c:"var(--border)"}`,
                    borderRadius:8,
                    padding:"8px 6px",
                    fontSize:10,
                    color:isV?"#fff":"var(--t2)",
                    fontWeight:800,
                    cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                  }}>
                  {!isPro&&!isV&&<span style={{fontSize:7,background:"var(--accent)",color:"#fff",borderRadius:4,padding:"1px 4px",fontWeight:800}}>PRO</span>}
                  {isV?"✓ ":""}{t.s} Wins
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{padding:"8px 14px",background:"rgba(232,0,45,.04)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"var(--t3)",fontWeight:700}}>⚔️ Fan War Room</div>
        <div style={{fontSize:9,color:"var(--accent)",fontWeight:800}}>Join the Roast →</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WAR TAB
// ════════════════════════════════════════════════════════════
function WarTab({match,selMatch,myTeam,setMyTeam,setSelMatch,matches,T1,T2,MT,OT,oppKey,roasts,input,setInput,send,sending,blocked,doVote,doReport,voted,reported,doAI,aiLoad,aiToast,topR,meter,myPct,isPro,roastsLeft,chatRef,setShowPro}) {

  // No match selected
  if (!selMatch) return (
    <div style={{padding:"12px 12px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"0 4px"}}>
        <div style={{width:3,height:16,background:"var(--accent)",borderRadius:2}}/>
        <span style={{fontSize:12,fontWeight:800,color:"#fff",letterSpacing:.5}}>Pick a War Room</span>
      </div>
      {matches.map((m,i)=>{
        const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",g:"135deg,#333,#111"};
        const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",g:"135deg,#333,#111"};
        return (
          <div key={m.id} className="btn fu" onClick={()=>setSelMatch(m.id)}
            style={{
              background:"var(--card)",
              border:"1px solid var(--border)",
              borderRadius:12,
              padding:"14px 16px",
              marginBottom:8,
              cursor:"pointer",
              display:"flex",alignItems:"center",gap:12,
              animationDelay:`${i*.06}s`,
              overflow:"hidden",
              position:"relative",
            }}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(${t1.g})`}}/>
            <div style={{paddingLeft:8,flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span className="bb" style={{fontSize:18,color:t1.c}}>{t1.s}</span>
                <span style={{fontSize:10,color:"var(--t3)",fontWeight:700}}>vs</span>
                <span className="bb" style={{fontSize:18,color:t2.c}}>{t2.s}</span>
                {m.status==="LIVE"&&<div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)"}}/>}
              </div>
              <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>📍 {m.venue}</div>
            </div>
            <div style={{fontSize:10,color:"var(--accent)",fontWeight:800}}>→</div>
          </div>
        );
      })}
    </div>
  );

  // Pick side
  if (!myTeam && match) return (
    <div style={{padding:"16px 14px 24px"}}>
      <button className="btn" onClick={()=>setSelMatch(null)} style={{background:"none",border:"none",color:"var(--t3)",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:20,padding:0}}>
        ← Back
      </button>
      <div className="si" style={{textAlign:"center",marginBottom:6}}>
        <div className="bb" style={{fontSize:34,color:"#fff",lineHeight:1}}>WHOSE SIDE<br/>ARE YOU ON?</div>
      </div>
      <div style={{fontSize:11,color:"var(--t3)",textAlign:"center",marginBottom:24,fontWeight:700}}>Pick your team. Your roasts represent them. 💀</div>
      <div style={{display:"flex",gap:10}}>
        {[match.t1,match.t2].map((tk,i)=>{
          const t=TEAMS[tk]||{s:tk,c:"#888",a:"#fff",g:"135deg,#333,#111",n:tk};
          const score=i===0?match.s1:match.s2;
          const overs=i===0?match.ov1:match.ov2;
          return (
            <button key={tk} className="btn fu" onClick={()=>setMyTeam(tk)}
              style={{
                flex:1,
                background:`linear-gradient(${t.g})`,
                borderRadius:16,
                padding:"24px 12px 20px",
                textAlign:"center",
                border:"none",
                cursor:"pointer",
                position:"relative",
                overflow:"hidden",
                animationDelay:`${i*.1}s`,
                boxShadow:`0 8px 28px ${t.c}35`,
              }}>
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)"}}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{width:50,height:50,borderRadius:13,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:13,color:"#fff",fontWeight:900,letterSpacing:.5,backdropFilter:"blur(4px)"}}>{t.s?.slice(0,2)}</div>
                <div className="bb" style={{fontSize:28,color:"#fff",lineHeight:1,marginBottom:3,letterSpacing:1}}>{t.s}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.6)",marginBottom:score?10:14,lineHeight:1.4,fontWeight:700}}>{t.n}</div>
                {score&&<div style={{fontSize:14,color:"rgba(255,255,255,.9)",fontWeight:800,marginBottom:12}}>{score}<span style={{fontSize:9,opacity:.6,marginLeft:4}}>({overs} ov)</span></div>}
                <div style={{background:"rgba(255,255,255,.15)",backdropFilter:"blur(6px)",borderRadius:9,padding:"7px 10px",fontSize:11,color:"#fff",fontWeight:800,border:"1px solid rgba(255,255,255,.2)"}}>
                  I'M {t.s} 💀
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",marginTop:16,fontWeight:700}}>⚠️ Not affiliated with BCCI/IPL. Fan platform only.</div>
    </div>
  );

  // War Room main
  if (match && myTeam && MT && OT) return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {/* War header */}
      <div style={{
        padding:"10px 14px 10px",
        background:"#0D0D14",
        borderBottom:"1px solid var(--border)",
        flexShrink:0,
      }}>
        {/* Top row */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button className="btn" onClick={()=>setMyTeam(null)} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,width:30,height:30,color:"var(--t2)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span className="bb" style={{fontSize:16,color:MT.c}}>{MT.s}</span>
              <span style={{fontSize:9,color:"var(--t3)",fontWeight:700}}>vs</span>
              <span className="bb" style={{fontSize:16,color:OT.c}}>{OT.s}</span>
              {match.status==="LIVE"&&<div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(232,0,45,.12)",border:"1px solid rgba(232,0,45,.2)",borderRadius:10,padding:"1px 6px",marginLeft:4}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:"#E8002D",animation:"liveDot 1.2s infinite"}}/>
                <span style={{fontSize:7,color:"#E8002D",fontWeight:800,letterSpacing:1}}>LIVE</span>
              </div>}
            </div>
            {(match.s1||match.s2)&&<div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>{match.t1}:{match.s1||"—"} · {match.t2}:{match.s2||"—"}</div>}
          </div>
          <button className="btn" onClick={doAI} disabled={aiLoad}
            style={{
              background:isPro?"rgba(232,0,45,.12)":"var(--card)",
              border:`1px solid ${isPro?"rgba(232,0,45,.25)":"var(--border)"}`,
              borderRadius:9,
              padding:"6px 10px",
              color:isPro?"var(--accent)":"var(--t3)",
              fontSize:10,
              fontWeight:800,
              cursor:"pointer",
              display:"flex",alignItems:"center",gap:5,
              flexShrink:0,
            }}>
            {!isPro&&<span style={{fontSize:7,background:"var(--accent)",color:"#fff",borderRadius:3,padding:"1px 4px",fontWeight:800}}>PRO</span>}
            {aiLoad?<span className="spin" style={{display:"inline-block",fontSize:12}}>⏳</span>:<span>🤖 AI</span>}
          </button>
        </div>

        {/* War meter */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,color:MT.c,fontWeight:800}}>{MT.s} {myPct}%</span>
            <span style={{fontSize:8,color:"var(--t3)",letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>⚔ War Meter ⚔</span>
            <span style={{fontSize:9,color:OT.c,fontWeight:800}}>{100-myPct}% {OT.s}</span>
          </div>
          <div style={{height:5,borderRadius:3,background:"var(--card3)",overflow:"hidden",position:"relative"}}>
            <div style={{height:"100%",width:`${myPct}%`,background:`linear-gradient(90deg,${MT.c},${MT.a})`,transition:"width 1s ease",borderRadius:3}}/>
          </div>
        </div>
      </div>

      {/* AI Toast */}
      {aiToast&&(
        <div className="fu" style={{margin:"8px 12px 0",background:"linear-gradient(135deg,rgba(232,0,45,.08),rgba(80,0,20,.12))",border:"1px solid rgba(232,0,45,.2)",borderRadius:10,padding:"9px 12px",display:"flex",gap:10,flexShrink:0}}>
          <span style={{fontSize:16}}>🤖</span>
          <div>
            <div style={{fontSize:8,color:"var(--accent)",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>AI Roasted {OT.s}</div>
            <div style={{fontSize:12,color:"var(--t1)",fontWeight:700,lineHeight:1.4}}>{aiToast}</div>
          </div>
        </div>
      )}

      {/* MOTM */}
      {topR&&(
        <div style={{margin:"6px 12px 0",background:"rgba(255,184,0,.04)",border:"1px solid rgba(255,184,0,.1)",borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:13}}>🏆</span>
          <span style={{fontSize:9,color:"var(--gold)",fontWeight:800}}>Man of the Roast:</span>
          <span style={{fontSize:9,color:"var(--gold)",fontWeight:700}}>{topR.uname||topR.user_name}</span>
          <span style={{fontSize:9,color:"var(--t3)",marginLeft:"auto",fontWeight:700}}>{topR.votes||0} 🔥</span>
        </div>
      )}

      {/* Chat messages */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {roasts.filter(r=>!r.hidden).map(msg=>{
          const name=msg.uname||msg.user_name||"Fan";
          const team=msg.team;
          const mt=TEAMS[team]||{s:team,c:"#888",a:"#fff",g:"135deg,#333,#111"};
          const isMe=team===myTeam;
          const vid=voted[msg.id];
          return (
            <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",animation:"fadeUp .25s ease-out both"}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3,[isMe?"marginRight":"marginLeft"]:4}}>
                <div style={{width:14,height:14,borderRadius:3,background:`linear-gradient(${mt.g})`,flexShrink:0}}/>
                <span style={{fontSize:9,color:mt.c,fontWeight:800,letterSpacing:.2}}>{name}</span>
                {msg.isAI&&<span style={{fontSize:7,background:"rgba(232,0,45,.15)",color:"var(--accent)",borderRadius:3,padding:"1px 4px",fontWeight:800}}>AI</span>}
                <span style={{fontSize:8,color:"var(--t3)",fontWeight:600}}>{timeAgo(msg.ts||Date.now())}</span>
              </div>
              <div style={{
                maxWidth:"83%",
                background:msg.isAI?"linear-gradient(135deg,rgba(232,0,45,.07),rgba(80,0,20,.12))":isMe?`linear-gradient(${mt.g})`:"var(--card2)",
                border:`1px solid ${isMe?(mt.c+"30"):"var(--border)"}`,
                borderRadius:isMe?"14px 4px 14px 14px":"4px 14px 14px 14px",
                padding:"9px 12px",
                position:"relative",
                boxShadow:isMe?`0 2px 10px ${mt.c}20`:"none",
              }}>
                {isMe&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",borderRadius:"inherit"}}/>}
                <div style={{position:"relative",zIndex:1,fontSize:13,color:"#fff",lineHeight:1.5,fontWeight:isMe?600:400}}>{msg.text}</div>
              </div>
              <div style={{display:"flex",gap:4,marginTop:3,[isMe?"marginRight":"marginLeft"]:4}}>
                {[["🔥",1],["💀",-1]].map(([icon,d])=>(
                  <button key={icon} className="btn" onClick={()=>doVote(msg.id,d)}
                    style={{
                      background:vid===d?"rgba(232,0,45,.18)":"rgba(255,255,255,.04)",
                      border:`1px solid ${vid===d?"rgba(232,0,45,.25)":"var(--border)"}`,
                      borderRadius:7,
                      padding:"3px 7px",
                      color:vid===d?"var(--accent)":"var(--t3)",
                      fontSize:9,
                      fontWeight:800,
                      cursor:"pointer",
                      opacity:(vid&&vid!==d)?.4:1,
                    }}>
                    {icon}{icon==="🔥"&&(msg.votes||0)>0?` ${msg.votes}`:""}
                  </button>
                ))}
                {!isMe&&!msg.isAI&&(
                  <button className="btn" onClick={()=>doReport(msg.id)}
                    style={{background:"none",border:"none",color:reported[msg.id]?"var(--accent)":"var(--t3)",fontSize:10,cursor:"pointer",padding:"3px 4px",opacity:.6}}>
                    🚩
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {roasts.filter(r=>!r.hidden).length===0&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>😶</div>
            <div style={{fontSize:13,fontWeight:800,color:"var(--t2)"}}>Dead silent in here</div>
            <div style={{fontSize:11,marginTop:4,color:"var(--t3)",fontWeight:600}}>Be the first to fire a roast 💀</div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{padding:"8px 12px 14px",background:"#0D0D14",borderTop:"1px solid var(--border)",flexShrink:0}}>
        {blocked&&<div className="shake" style={{background:"rgba(232,0,45,.08)",border:"1px solid rgba(232,0,45,.2)",borderRadius:9,padding:"7px 12px",marginBottom:7,fontSize:11,color:"var(--accent)",textAlign:"center",fontWeight:700}}>🚫 Blocked — Cricket banter only, no hate speech</div>}
        {!isPro&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontSize:9,color:roastsLeft<=0?"var(--accent)":"var(--t3)",fontWeight:700}}>{roastsLeft<=0?"❌ No roasts left today":"🔥 "+roastsLeft+" free roasts left"}</span>
            <button className="btn" onClick={()=>setShowPro(true)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:9,fontWeight:800,cursor:"pointer",letterSpacing:.5}}>UPGRADE TO PRO →</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{
            flex:1,
            background:"var(--card)",
            border:`1.5px solid ${blocked?"rgba(232,0,45,.35)":"var(--border2)"}`,
            borderRadius:12,
            padding:"10px 12px",
            display:"flex",alignItems:"center",gap:8,
            transition:"border .2s",
          }}>
            <div style={{width:5,height:5,borderRadius:"50%",background:MT?.c,flexShrink:0}}/>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder={`Roast ${OT?.s} fans... 💀`}
              maxLength={120}
              style={{flex:1,background:"none",border:"none",color:"var(--t1)",fontSize:13,fontWeight:600}}
            />
            <span style={{fontSize:9,color:"var(--t3)",flexShrink:0,fontWeight:700}}>{120-input.length}</span>
          </div>
          <button className="btn" onClick={roastsLeft<=0&&!isPro?()=>setShowPro(true):send} disabled={!input.trim()||sending}
            style={{
              width:44,height:44,
              borderRadius:12,
              background:input.trim()&&!sending?"var(--accent)":"var(--card)",
              border:"none",
              color:"#fff",
              fontSize:18,
              cursor:input.trim()&&!sending?"pointer":"default",
              display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,
              transition:"all .2s",
              boxShadow:input.trim()?"0 3px 14px rgba(232,0,45,.3)":"none",
            }}>
            {sending?<span className="spin" style={{display:"inline-block",fontSize:12}}>⏳</span>:"🔥"}
          </button>
        </div>
        <div style={{fontSize:8,color:"var(--t3)",marginTop:5,textAlign:"center",fontWeight:600}}>AI moderated · Not affiliated with BCCI or IPL</div>
      </div>
    </div>
  );

  return null;
}

// ════════════════════════════════════════════════════════════
// PROFILE TAB
// ════════════════════════════════════════════════════════════
function ProfileTab({user,isPro,setShowPro,onLogout}) {
  return (
    <div style={{padding:"16px 14px 32px"}}>
      {/* Profile hero */}
      <div className="fu" style={{
        background:isPro?"linear-gradient(135deg,rgba(255,184,0,.07),var(--card))":"linear-gradient(135deg,rgba(232,0,45,.06),var(--card))",
        border:`1px solid ${isPro?"rgba(255,184,0,.15)":"var(--border)"}`,
        borderRadius:16,
        padding:"24px 20px",
        marginBottom:12,
        textAlign:"center",
        position:"relative",
        overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:0,right:0,width:120,height:120,borderRadius:"50%",background:isPro?"rgba(255,184,0,.04)":"rgba(232,0,45,.04)",transform:"translate(30%,-30%)"}}/>
        <div style={{
          width:70,height:70,
          borderRadius:18,
          background:isPro?"linear-gradient(135deg,var(--gold),#ff9800)":"linear-gradient(135deg,var(--accent),#ff6b6b)",
          display:"flex",alignItems:"center",justifyContent:"center",
          margin:"0 auto 12px",
          fontSize:26,fontWeight:900,
          boxShadow:`0 6px 20px ${isPro?"rgba(255,184,0,.25)":"rgba(232,0,45,.25)"}`,
          overflow:"hidden",
          position:"relative",zIndex:1,
        }}>
          {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
        </div>
        <div className="bb" style={{fontSize:26,fontWeight:700,marginBottom:4,position:"relative",zIndex:1}}>{user?.name}</div>
        <div style={{
          display:"inline-flex",alignItems:"center",gap:6,
          background:isPro?"rgba(255,184,0,.1)":"rgba(255,255,255,.05)",
          border:`1px solid ${isPro?"rgba(255,184,0,.2)":"var(--border)"}`,
          borderRadius:16,padding:"4px 12px",
          fontSize:11,color:isPro?"var(--gold)":"var(--t2)",fontWeight:800,
          position:"relative",zIndex:1,
        }}>
          {isPro?"👑 PRO MEMBER":"🔓 FREE PLAN"}
        </div>
      </div>

      {/* Plan box */}
      {!isPro ? (
        <div className="fu glass" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"18px",marginBottom:10,animationDelay:".08s"}}>
          <div className="bb" style={{fontSize:16,marginBottom:14,color:"var(--t1)",letterSpacing:1}}>FREE PLAN LIMITS</div>
          {[["✅","Live scores — all matches"],["✅","War room — read & roast"],["⚡","3 roasts per day only"],["🔒","Win predictions — locked"],["🔒","AI Roast button — locked"],["📢","Ads shown"]].map(([ic,ft])=>(
            <div key={ft} style={{display:"flex",gap:10,marginBottom:9,alignItems:"center"}}>
              <span style={{fontSize:13,width:18,textAlign:"center"}}>{ic}</span>
              <span style={{fontSize:12,fontWeight:700,color:ft.includes("locked")||ft.includes("only")||ft.includes("Ads")?"var(--t3)":"var(--t2)"}}>{ft}</span>
            </div>
          ))}
          <button className="btn" onClick={()=>setShowPro(true)}
            style={{width:"100%",marginTop:12,background:"linear-gradient(135deg,var(--accent),#ff6b35)",borderRadius:10,padding:"13px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:.5,boxShadow:"0 4px 16px rgba(232,0,45,.3)"}}>
            Upgrade to Pro — ₹49/month 👑
          </button>
        </div>
      ) : (
        <div className="fu" style={{background:"rgba(255,184,0,.04)",border:"1px solid rgba(255,184,0,.12)",borderRadius:14,padding:"18px",marginBottom:10,animationDelay:".08s"}}>
          <div className="bb" style={{fontSize:16,marginBottom:14,color:"var(--gold)",letterSpacing:1}}>👑 PRO BENEFITS</div>
          {[["✅","Unlimited roasts every match"],["✅","AI Roast button — 10/day"],["✅","Win predictions voting"],["✅","Zero ads forever"],["✅","Man of the Match badge"]].map(([ic,ft])=>(
            <div key={ft} style={{display:"flex",gap:10,marginBottom:9,alignItems:"center"}}>
              <span style={{fontSize:13}}>{ic}</span>
              <span style={{fontSize:12,fontWeight:700,color:"var(--t2)"}}>{ft}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="fu" style={{animationDelay:".15s"}}>
        <button className="btn" onClick={onLogout}
          style={{width:"100%",background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"13px",color:"var(--t2)",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10}}>
          Sign Out
        </button>
        <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",lineHeight:1.8,fontWeight:600}}>
          CricRoar is not affiliated with BCCI or IPL · Fan platform only<br/>
          Made with ❤️ for cricket fans
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PRO MODAL
// ════════════════════════════════════════════════════════════
function ProModal({isPro,onBuy,onClose}) {
  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(14px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="su" style={{
        background:"var(--card)",
        border:"1px solid var(--border2)",
        borderRadius:"22px 22px 0 0",
        padding:"28px 22px 40px",
        width:"100%",
        maxWidth:480,
        maxHeight:"88vh",
        overflowY:"auto",
        position:"relative",
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,borderRadius:2,background:"var(--card3)",margin:"0 auto 20px"}}/>
        <button className="btn" onClick={onClose} style={{position:"absolute",top:20,right:18,background:"var(--card2)",border:"none",borderRadius:"50%",width:30,height:30,color:"var(--t2)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>

        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:44,marginBottom:8}}>👑</div>
          <div className="bb" style={{fontSize:32,color:"var(--gold)",marginBottom:5,letterSpacing:1}}>GO PRO</div>
          <div style={{fontSize:13,color:"var(--t2)",fontWeight:600}}>Unlock the full CricRoar experience</div>
        </div>

        <div style={{marginBottom:22}}>
          {[
            ["⚔️","Unlimited roasts","Free: 3/day only"],
            ["🤖","AI Roast button","Free: locked"],
            ["📊","Vote on win predictions","Free: view only"],
            ["🚫","Zero ads forever","Free: ads shown"],
            ["🏆","Man of the Match badge","Free: locked"],
          ].map(([ic,ft,sub])=>(
            <div key={ft} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:20,width:28,textAlign:"center"}}>{ic}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{ft}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontWeight:600}}>{sub}</div>
              </div>
              <span style={{fontSize:14}}>✅</span>
            </div>
          ))}
        </div>

        <button className="btn" onClick={onBuy}
          style={{
            width:"100%",
            background:"linear-gradient(135deg,var(--accent),#ff6b35)",
            borderRadius:14,
            padding:"17px",
            color:"#fff",
            fontFamily:"'Bebas Neue',sans-serif",
            fontSize:22,
            fontWeight:400,
            cursor:"pointer",
            letterSpacing:2,
            boxShadow:"0 8px 28px rgba(232,0,45,.35)",
          }}>
          ₹49 / MONTH — UNLOCK NOW
        </button>
        <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",marginTop:10,fontWeight:700}}>
          Cancel anytime · Secure via Razorpay · Auto-renews monthly
        </div>
      </div>
    </div>
  );
}
