import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// CRICROAR — Full App v2
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
  RCB:  { n:"Royal Challengers Bengaluru", s:"RCB",  c:"#FF1744", a:"#FFD600", g:"135deg,#FF1744,#7B0000" },
  MI:   { n:"Mumbai Indians",              s:"MI",   c:"#0D47A1", a:"#29B6F6", g:"135deg,#0D47A1,#01285A" },
  CSK:  { n:"Chennai Super Kings",         s:"CSK",  c:"#F9A825", a:"#1565C0", g:"135deg,#F9A825,#E65100" },
  KKR:  { n:"Kolkata Knight Riders",       s:"KKR",  c:"#6A1B9A", a:"#FFD600", g:"135deg,#6A1B9A,#2E003E" },
  SRH:  { n:"Sunrisers Hyderabad",         s:"SRH",  c:"#E64A19", a:"#FFE57F", g:"135deg,#E64A19,#BF360C" },
  DC:   { n:"Delhi Capitals",              s:"DC",   c:"#1565C0", a:"#F44336", g:"135deg,#1565C0,#B71C1C" },
  PBKS: { n:"Punjab Kings",               s:"PBKS", c:"#C62828", a:"#FFD600", g:"135deg,#C62828,#7F0000" },
  GT:   { n:"Gujarat Titans",             s:"GT",   c:"#1A237E", a:"#CFB46A", g:"135deg,#1A237E,#000051" },
  LSG:  { n:"Lucknow Super Giants",       s:"LSG",  c:"#880E4F", a:"#F9D342", g:"135deg,#880E4F,#4A0033" },
  RR:   { n:"Rajasthan Royals",           s:"RR",   c:"#283593", a:"#F48FB1", g:"135deg,#283593,#001064" },
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
    // Google OAuth via Supabase Auth
    signInGoogle: async (url) => {
      const r = await fetch(`${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`, { headers:{ apikey:key } });
      return r.url;
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
    theme:{ color:"#FF1744" }
  }).open();
}

const uid = ()=>`u_${Math.random().toString(36).slice(2,10)}`;
const today = ()=>new Date().toISOString().slice(0,10);
const timeAgo = (ts) => { const s=Math.floor((Date.now()-ts)/1000); if(s<60)return "now"; if(s<3600)return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`; };
const FREE_LIMIT = 3;

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const G = `
@import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@600;700&display=swap');
:root{
  --bg:#07070E;--s1:#0F0F1A;--s2:#161625;--s3:#1E1E30;
  --b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.11);--b3:rgba(255,255,255,.18);
  --t1:#F2F2FF;--t2:#A0A0C0;--t3:#585878;
  --red:#FF1744;--red2:#FF4569;--gold:#FFD600;
  --r:16px;--r2:12px;--r3:24px;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;background:var(--bg);overscroll-behavior:none}
body{color:var(--t1);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.5}
.cd{font-family:'Clash Display',sans-serif}
::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:var(--red);border-radius:2px}
.btn{transition:all .16s cubic-bezier(.4,0,.2,1);cursor:pointer;border:none;outline:none;-webkit-user-select:none;user-select:none}
.btn:active{transform:scale(.95);opacity:.85}
input,textarea{font-family:'Plus Jakarta Sans',sans-serif}
input:focus,textarea:focus{outline:none}
input::placeholder{color:var(--t3)}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(255,23,68,.3)}50%{box-shadow:0 0 40px rgba(255,23,68,.6)}}

.fu{animation:fadeUp .35s cubic-bezier(.4,0,.2,1) both}
.fi{animation:fadeIn .3s ease both}
.si{animation:scaleIn .3s cubic-bezier(.4,0,.2,1) both}
.su{animation:slideUp .4s cubic-bezier(.4,0,.2,1) both}
.pulse{animation:pulse 2s infinite}
.shake{animation:shake .4s}
.spin{animation:spin 1s linear infinite}

/* Glass card */
.glass{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r)}
.glass2{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r)}

/* Bottom nav */
.nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 16px;cursor:pointer;transition:all .2s;border-radius:12px;flex:1}
.nav-item.active .nav-icon{color:var(--red)}
.nav-item.active .nav-label{color:var(--red)}
.nav-icon{font-size:20px;transition:transform .2s}
.nav-label{font-size:9px;font-weight:600;letter-spacing:.5px;color:var(--t3);text-transform:uppercase}
.nav-item.active .nav-icon{transform:scale(1.1)}
`;

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function CricRoar() {
  const [page, setPage]           = useState("splash");   // splash→login→main
  const [tab, setTab]             = useState("scores");   // scores|war|profile
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
      // Check stored user
      const stored = localStorage.getItem("cr_user");
      if (stored) { try{ const u=JSON.parse(stored); setUser(u); setPage("main"); return; }catch{} }
      // Check OAuth return
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
    }, 1800);
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
    window.location.href = `${CFG.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
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
  // SPLASH
  // ════════════════════════════════════════════════════════════
  if (page==="splash") return (
    <div style={{height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      {/* Animated background orbs */}
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,23,68,.25) 0%,transparent 70%)",top:"10%",left:"50%",transform:"translateX(-50%)",filter:"blur(40px)",animation:"pulse 3s infinite"}}/>
      <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,214,0,.1) 0%,transparent 70%)",bottom:"20%",right:"10%",filter:"blur(30px)"}}/>
      <div className="fi" style={{textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{fontSize:72,marginBottom:8}}>🏏</div>
        <div className="cd" style={{fontSize:56,fontWeight:700,letterSpacing:3,background:"linear-gradient(135deg,#fff 30%,var(--red) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>CRIC<span style={{color:"var(--red)"}}>ROAR</span></div>
        <div style={{fontSize:11,color:"var(--t3)",letterSpacing:4,marginTop:8,textTransform:"uppercase"}}>Fan War Room</div>
        <div style={{marginTop:32,display:"flex",gap:6,justifyContent:"center"}}>
          {[0,1,2].map(i=><div key={i} className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"var(--red)",animationDelay:`${i*.2}s`}}/>)}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════
  if (page==="login") return (
    <div style={{height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(255,23,68,.15) 0%,transparent 55%)",pointerEvents:"none"}}/>

      {/* Hero */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px 0",position:"relative",zIndex:1}}>
        <div className="fu" style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:56,marginBottom:16}}>🏏</div>
          <div className="cd" style={{fontSize:48,fontWeight:700,letterSpacing:2,lineHeight:1,marginBottom:12}}>
            <span style={{color:"var(--t1)"}}>CRIC</span><span style={{color:"var(--red)"}}>ROAR</span>
          </div>
          <div style={{fontSize:15,color:"var(--t2)",lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>
            The most savage cricket fan war room. Roast. Battle. Win the internet.
          </div>
        </div>

        {/* Stats */}
        <div className="fu" style={{display:"flex",gap:10,marginBottom:40,animationDelay:".1s"}}>
          {[["🔥","14K+","Roasts"],["⚔️","3","Live Wars"],["👑","IPL 2026","Season"]].map(([i,v,l])=>(
            <div key={l} style={{flex:1,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{i}</div>
              <div className="cd" style={{fontSize:16,color:"var(--red)",fontWeight:700}}>{v}</div>
              <div style={{fontSize:9,color:"var(--t3)",letterSpacing:.5,textTransform:"uppercase",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {!nameStep ? (
          <div className="fu" style={{width:"100%",maxWidth:360,animationDelay:".2s"}}>
            {/* Google Login */}
            <button className="btn" onClick={loginGoogle}
              style={{width:"100%",background:"#fff",borderRadius:14,padding:"15px 20px",color:"#1a1a1a",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12,boxShadow:"0 4px 24px rgba(0,0,0,.3)"}}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            {/* Guest */}
            <button className="btn" onClick={()=>setNameStep(true)}
              style={{width:"100%",background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:14,padding:"15px 20px",color:"var(--t2)",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              👤 Continue as Guest
            </button>
            <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",marginTop:14,lineHeight:1.7}}>
              Not affiliated with BCCI or IPL · Fan platform only<br/>By continuing you agree to keep it cricket banter only
            </div>
          </div>
        ) : (
          <div className="fu" style={{width:"100%",maxWidth:360,animationDelay:".1s"}}>
            <div style={{fontSize:14,color:"var(--t2)",textAlign:"center",marginBottom:20,fontWeight:600}}>Choose your roast name 🔥</div>
            <input value={nameVal} onChange={e=>setNameVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&nameVal.trim()&&loginGuest()}
              placeholder="e.g. RCBMacha99" maxLength={20} autoFocus
              style={{width:"100%",background:"var(--s2)",border:"2px solid var(--b2)",borderRadius:14,padding:"16px 18px",color:"var(--t1)",fontSize:18,fontWeight:700,textAlign:"center",marginBottom:12}}/>
            <button className="btn" onClick={loginGuest} disabled={!nameVal.trim()}
              style={{width:"100%",background:nameVal.trim()?"var(--red)":"var(--s3)",borderRadius:14,padding:"15px",color:"#fff",fontSize:15,fontWeight:700,cursor:nameVal.trim()?"pointer":"default",letterSpacing:.5}}>
              Enter the War Room →
            </button>
            <button className="btn" onClick={()=>setNameStep(false)}
              style={{width:"100%",background:"none",border:"none",color:"var(--t3)",fontSize:13,cursor:"pointer",marginTop:10,padding:"8px"}}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════════════
  if (page==="main") return (
    <div style={{height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",position:"relative",maxWidth:480,margin:"0 auto"}}>
      <style>{G}</style>

      {/* Header */}
      <div style={{padding:"14px 20px 10px",background:"rgba(7,7,14,.95)",borderBottom:"1px solid var(--b1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,backdropFilter:"blur(20px)"}}>
        <div className="cd" style={{fontSize:22,fontWeight:700,letterSpacing:1}}>
          CRIC<span style={{color:"var(--red)"}}>ROAR</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {paidOk&&<div className="fu" style={{fontSize:11,color:"var(--gold)",fontWeight:700,background:"rgba(255,214,0,.1)",border:"1px solid rgba(255,214,0,.2)",borderRadius:20,padding:"4px 10px"}}>👑 PRO Unlocked!</div>}
          <div onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:20,padding:"6px 12px 6px 6px"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:isPro?"linear-gradient(135deg,var(--gold),#ff9800)":"linear-gradient(135deg,var(--red),#ff6b6b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>
              {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,lineHeight:1}}>{user?.name?.split(" ")[0]}</div>
              <div style={{fontSize:9,color:isPro?"var(--gold)":"var(--t3)",letterSpacing:.5,textTransform:"uppercase"}}>{isPro?"PRO":"FREE"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:tab==="war"&&selMatch&&myTeam?"hidden":"auto",position:"relative"}}>
        {tab==="scores" && <ScoresTab matches={matches} preds={preds} userPred={userPred} isPro={isPro} onMatchClick={(id)=>{setSelMatch(id);setTab("war");}} doPredict={doPredict} setShowPro={setShowPro}/>}
        {tab==="war"    && <WarTab match={match} selMatch={selMatch} myTeam={myTeam} setMyTeam={setMyTeam} setSelMatch={setSelMatch} matches={matches} T1={T1} T2={T2} MT={MT} OT={OT} oppKey={oppKey} roasts={roasts} input={input} setInput={setInput} send={send} sending={sending} blocked={blocked} doVote={doVote} doReport={doReport} voted={voted} reported={reported} doAI={doAI} aiLoad={aiLoad} aiToast={aiToast} topR={topR} meter={meter} myPct={myPct} isPro={isPro} roastsLeft={roastsLeft} chatRef={chatRef} setShowPro={setShowPro}/>}
        {tab==="profile"&& <ProfileTab user={user} isPro={isPro} setShowPro={setShowPro} onLogout={()=>{ localStorage.removeItem("cr_user"); localStorage.removeItem("cr_token"); setUser(null); setPage("login"); }}/>}
      </div>

      {/* Bottom Nav */}
      <div style={{display:"flex",padding:"8px 8px 16px",background:"rgba(7,7,14,.97)",borderTop:"1px solid var(--b1)",flexShrink:0,backdropFilter:"blur(20px)"}}>
        {[["scores","📊","Scores"],["war","⚔️","War Room"],["profile","👤","Profile"]].map(([t,icon,label])=>(
          <div key={t} className={`nav-item btn${tab===t?" active":""}`} onClick={()=>setTab(t)}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Pro Modal */}
      {showPro && <ProModal isPro={isPro} onBuy={buyPro} onClose={()=>setShowPro(false)}/>}
    </div>
  );

  return null;
}

// ════════════════════════════════════════════════════════════
// SCORES TAB
// ════════════════════════════════════════════════════════════
function ScoresTab({matches,preds,userPred,isPro,onMatchClick,doPredict,setShowPro}) {
  return (
    <div style={{padding:"16px 16px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontSize:11,color:"var(--t3)",letterSpacing:3,fontWeight:600,textTransform:"uppercase"}}>IPL 2026</div>
        <div style={{fontSize:10,color:"var(--t3)"}}>Auto-refreshes every 30s</div>
      </div>
      {matches.map((m,i)=><MatchCard key={m.id} m={m} pred={preds[m.id]} voted={userPred[m.id]} isPro={isPro} delay={i*.08} onClick={()=>onMatchClick(m.id)} doPredict={doPredict} setShowPro={setShowPro}/>)}
    </div>
  );
}

function MatchCard({m,pred,voted,isPro,delay,onClick,doPredict,setShowPro}) {
  const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",a:"#fff",g:"135deg,#333,#111"};
  const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",a:"#fff",g:"135deg,#333,#111"};
  return (
    <div className="fu glass btn" onClick={onClick} style={{marginBottom:12,overflow:"hidden",cursor:"pointer",animationDelay:`${delay}s`,position:"relative"}}>
      {/* Top accent bar */}
      <div style={{height:3,background:`linear-gradient(90deg,${t1.c},${t2.c})`,opacity:.7}}/>
      <div style={{padding:"16px 16px 14px"}}>
        {/* Status + venue */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--t3)",display:"flex",alignItems:"center",gap:6}}>
            📍 {m.venue}
          </div>
          {m.status==="LIVE" && (
            <div className="pulse" style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,23,68,.12)",border:"1px solid rgba(255,23,68,.25)",borderRadius:20,padding:"4px 10px"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"var(--red)"}}/>
              <span style={{fontSize:9,color:"var(--red)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Live</span>
            </div>
          )}
          {m.status==="TODAY" && <div style={{background:"rgba(255,214,0,.1)",border:"1px solid rgba(255,214,0,.2)",borderRadius:20,padding:"4px 10px",fontSize:9,color:"var(--gold)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Today</div>}
          {m.status==="UPCOMING" && <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:20,padding:"4px 10px",fontSize:9,color:"var(--t3)",letterSpacing:1}}>🗓 {m.time}</div>}
        </div>

        {/* Teams + scores */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:m.status==="LIVE"?16:12}}>
          <TeamPill team={t1} score={m.s1} overs={m.ov1}/>
          <div style={{flex:1,textAlign:"center"}}>
            <div className="cd" style={{fontSize:12,color:"var(--t3)",letterSpacing:3}}>VS</div>
            {m.target&&<div style={{fontSize:10,color:"var(--t2)",marginTop:3}}>Target {m.target}</div>}
          </div>
          <TeamPill team={t2} score={m.s2} overs={m.ov2} right/>
        </div>

        {/* Win prediction bar */}
        {pred && (
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:10,color:t1.c,fontWeight:700}}>{t1.s} {pred.t1}%</span>
              <span style={{fontSize:9,color:"var(--t3)",letterSpacing:1,textTransform:"uppercase"}}>Fan Prediction</span>
              <span style={{fontSize:10,color:t2.c,fontWeight:700}}>{pred.t2}% {t2.s}</span>
            </div>
            <div style={{height:5,borderRadius:3,background:"var(--s3)",overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pred.t1}%`,background:`linear-gradient(90deg,${t1.c},${t1.a})`,transition:"width .8s cubic-bezier(.4,0,.2,1)",borderRadius:3}}/>
            </div>
          </div>
        )}

        {/* Predict buttons */}
        {m.status==="LIVE" && (
          <div style={{display:"flex",gap:8}}>
            {[m.t1,m.t2].map(tk=>{
              const t=TEAMS[tk]||{s:tk,c:"#888"};
              const isVoted=voted===tk;
              return (
                <button key={tk} className="btn" onClick={e=>{e.stopPropagation();doPredict(m.id,tk);}}
                  style={{flex:1,background:isVoted?`linear-gradient(${t.g})`:"var(--s2)",border:`1px solid ${isVoted?t.c:"var(--b2)"}`,borderRadius:10,padding:"9px 8px",fontSize:11,color:isVoted?"#fff":"var(--t2)",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .2s"}}>
                  {!isPro&&!isVoted&&<span style={{fontSize:8,background:"var(--red)",color:"#fff",borderRadius:4,padding:"1px 5px",letterSpacing:.5}}>PRO</span>}
                  {isVoted?"✓ ":""}{t.s} wins
                </button>
              );
            })}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10,alignItems:"center",gap:4}}>
          <span style={{fontSize:10,color:"var(--red)",fontWeight:600}}>Enter War Room</span>
          <span style={{fontSize:14,color:"var(--red)"}}>→</span>
        </div>
      </div>
    </div>
  );
}

function TeamPill({team,score,overs,right}) {
  return (
    <div style={{flex:1,textAlign:right?"right":"left"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,flexDirection:right?"row-reverse":"row",marginBottom:4}}>
        <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(${team.g})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700,letterSpacing:.5,flexShrink:0}}>{team.s?.slice(0,2)}</div>
        <div className="cd" style={{fontSize:20,fontWeight:700,color:team.c,letterSpacing:1}}>{team.s}</div>
      </div>
      {score
        ? <div style={{textAlign:right?"right":"left"}}><span style={{fontSize:18,fontWeight:700,color:"var(--t1)"}}>{score}</span><span style={{fontSize:11,color:"var(--t3)",marginLeft:4}}>({overs} ov)</span></div>
        : <div style={{fontSize:11,color:"var(--t3)"}}>—</div>
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WAR TAB
// ════════════════════════════════════════════════════════════
function WarTab({match,selMatch,myTeam,setMyTeam,setSelMatch,matches,T1,T2,MT,OT,oppKey,roasts,input,setInput,send,sending,blocked,doVote,doReport,voted,reported,doAI,aiLoad,aiToast,topR,meter,myPct,isPro,roastsLeft,chatRef,setShowPro}) {

  // No match selected
  if (!selMatch) return (
    <div style={{padding:"16px 16px 24px"}}>
      <div style={{fontSize:11,color:"var(--t3)",letterSpacing:3,fontWeight:600,textTransform:"uppercase",marginBottom:16}}>Pick a War Room</div>
      {matches.map((m,i)=>{
        const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",g:"135deg,#333,#111"};
        const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",g:"135deg,#333,#111"};
        return (
          <div key={m.id} className="glass btn fu" onClick={()=>setSelMatch(m.id)}
            style={{padding:"16px 18px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12,animationDelay:`${i*.08}s`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(${t1.g})`}}/>
            <div style={{paddingLeft:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span className="cd" style={{fontSize:20,color:t1.c,fontWeight:700}}>{t1.s}</span>
                <span style={{fontSize:11,color:"var(--t3)"}}>vs</span>
                <span className="cd" style={{fontSize:20,color:t2.c,fontWeight:700}}>{t2.s}</span>
                {m.status==="LIVE"&&<div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"var(--red)",marginLeft:4}}/>}
              </div>
              <div style={{fontSize:10,color:"var(--t3)"}}>📍 {m.venue}</div>
            </div>
            <div style={{marginLeft:"auto",fontSize:18,color:"var(--red)"}}>→</div>
          </div>
        );
      })}
    </div>
  );

  // Pick side
  if (!myTeam && match) return (
    <div style={{padding:"24px 16px"}}>
      <button className="btn" onClick={()=>setSelMatch(null)} style={{background:"none",border:"none",color:"var(--t3)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:24,padding:0}}>
        ← Back
      </button>
      <div className="cd si" style={{fontSize:32,fontWeight:700,textAlign:"center",marginBottom:6,lineHeight:1}}>WHOSE SIDE<br/>ARE YOU ON?</div>
      <div style={{fontSize:12,color:"var(--t3)",textAlign:"center",marginBottom:32}}>Pick your team. Your roasts represent them.</div>
      <div style={{display:"flex",gap:12}}>
        {[match.t1,match.t2].map((tk,i)=>{
          const t=TEAMS[tk]||{s:tk,c:"#888",a:"#fff",g:"135deg,#333,#111",n:tk};
          const score=i===0?match.s1:match.s2;
          const overs=i===0?match.ov1:match.ov2;
          return (
            <button key={tk} className="btn fu" onClick={()=>setMyTeam(tk)}
              style={{flex:1,background:`linear-gradient(${t.g})`,borderRadius:20,padding:"28px 16px 24px",textAlign:"center",border:"none",cursor:"pointer",position:"relative",overflow:"hidden",animationDelay:`${i*.1}s`,boxShadow:`0 8px 32px ${t.c}33`}}>
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)"}}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{width:48,height:48,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:14,color:"#fff",fontWeight:800,letterSpacing:1}}>{t.s?.slice(0,2)}</div>
                <div className="cd" style={{fontSize:28,color:"#fff",fontWeight:700,letterSpacing:1,marginBottom:4}}>{t.s}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginBottom:score?8:16,lineHeight:1.4}}>{t.n}</div>
                {score&&<div style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:600,marginBottom:12}}>{score} <span style={{fontSize:10,opacity:.7}}>({overs} ov)</span></div>}
                <div style={{background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#fff",fontWeight:700,border:"1px solid rgba(255,255,255,.2)"}}>
                  I'M {t.s} 💀
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",marginTop:20}}>⚠️ Not affiliated with BCCI/IPL. Fan platform.</div>
    </div>
  );

  // War Room
  if (match && myTeam && MT && OT) return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {/* War header */}
      <div style={{padding:"10px 16px",background:"var(--s1)",borderBottom:"1px solid var(--b1)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button className="btn" onClick={()=>setMyTeam(null)} style={{background:"none",border:"none",color:"var(--t3)",fontSize:18,cursor:"pointer",padding:0,lineHeight:1}}>←</button>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
            <div className="cd" style={{fontSize:16,fontWeight:700,color:MT.c}}>{MT.s}</div>
            <div style={{fontSize:10,color:"var(--t3)"}}>vs</div>
            <div className="cd" style={{fontSize:16,fontWeight:700,color:OT.c}}>{OT.s}</div>
            {match.status==="LIVE"&&<div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"var(--red)"}}/>}
            {(match.s1||match.s2)&&<div style={{fontSize:9,color:"var(--t3)",marginLeft:4}}>{match.t1}:{match.s1||"—"} · {match.t2}:{match.s2||"—"}</div>}
          </div>
          <button className="btn" onClick={doAI} disabled={aiLoad}
            style={{background:isPro?"rgba(255,23,68,.15)":"var(--s3)",border:`1px solid ${isPro?"rgba(255,23,68,.3)":"var(--b1)"}`,borderRadius:10,padding:"7px 12px",color:isPro?"var(--red)":"var(--t3)",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {!isPro&&<span style={{fontSize:8,background:"var(--red)",color:"#fff",borderRadius:3,padding:"1px 4px"}}>PRO</span>}
            {aiLoad?<span className="spin" style={{display:"inline-block"}}>⏳</span>:"🤖"}
          </button>
        </div>

        {/* War meter */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,color:MT.c,fontWeight:700,letterSpacing:.5}}>{MT.s} {myPct}%</span>
            <span style={{fontSize:9,color:"var(--t3)",letterSpacing:2,textTransform:"uppercase"}}>War Meter</span>
            <span style={{fontSize:9,color:OT.c,fontWeight:700,letterSpacing:.5}}>{100-myPct}% {OT.s}</span>
          </div>
          <div style={{height:4,borderRadius:2,background:"var(--s3)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${myPct}%`,background:`linear-gradient(90deg,${MT.c},${MT.a})`,transition:"width 1s cubic-bezier(.4,0,.2,1)",borderRadius:2}}/>
          </div>
        </div>
      </div>

      {/* AI Toast */}
      {aiToast&&(
        <div className="fu" style={{margin:"8px 12px 0",background:"linear-gradient(135deg,rgba(255,23,68,.1),rgba(100,0,20,.15))",border:"1px solid rgba(255,23,68,.25)",borderRadius:12,padding:"10px 14px",display:"flex",gap:10,flexShrink:0}}>
          <span style={{fontSize:18}}>🤖</span>
          <div><div style={{fontSize:8,color:"var(--red)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:3}}>AI Roasted {OT.s}</div>
          <div style={{fontSize:13,color:"var(--t1)",fontWeight:600,lineHeight:1.4}}>{aiToast}</div></div>
        </div>
      )}

      {/* MOTM */}
      {topR&&(
        <div style={{margin:"6px 12px 0",background:"rgba(255,214,0,.04)",border:"1px solid rgba(255,214,0,.12)",borderRadius:10,padding:"6px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:14}}>🏆</span>
          <span style={{fontSize:10,color:"var(--gold)",fontWeight:700}}>Man of the Roast:</span>
          <span style={{fontSize:10,color:"var(--gold)"}}>{topR.uname||topR.user_name}</span>
          <span style={{fontSize:10,color:"var(--t3)",marginLeft:"auto"}}>{topR.votes||0} 🔥</span>
        </div>
      )}

      {/* Messages */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
        {roasts.filter(r=>!r.hidden).map(msg=>{
          const name=msg.uname||msg.user_name||"Fan";
          const team=msg.team;
          const mt=TEAMS[team]||{s:team,c:"#888",a:"#fff"};
          const isMe=team===myTeam;
          const vid=voted[msg.id];
          return (
            <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",animation:"fadeUp .3s ease-out both"}}>
              {/* Sender name */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,[isMe?"marginRight":"marginLeft"]:4}}>
                <div style={{width:16,height:16,borderRadius:4,background:`linear-gradient(${mt.g})`,flexShrink:0}}/>
                <span style={{fontSize:9,color:mt.c,fontWeight:700,letterSpacing:.3}}>{name}</span>
                {msg.isAI&&<span style={{fontSize:8,background:"rgba(255,23,68,.15)",color:"var(--red)",borderRadius:4,padding:"1px 5px"}}>AI</span>}
                <span style={{fontSize:9,color:"var(--t3)"}}>{timeAgo(msg.ts||Date.now())}</span>
              </div>
              {/* Bubble */}
              <div style={{maxWidth:"82%",background:msg.isAI?"linear-gradient(135deg,rgba(255,23,68,.08),rgba(80,0,20,.15))":isMe?`linear-gradient(${mt.g})`:"var(--s2)",border:`1px solid ${isMe?(mt.c+"30"):"var(--b1)"}`,borderRadius:isMe?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"10px 13px",position:"relative"}}>
                {isMe&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.35)",borderRadius:"inherit"}}/>}
                <div style={{position:"relative",zIndex:1,fontSize:13,color:"#fff",lineHeight:1.5,fontWeight:isMe?500:400}}>{msg.text}</div>
              </div>
              {/* Actions */}
              <div style={{display:"flex",gap:5,marginTop:4,[isMe?"marginRight":"marginLeft"]:4}}>
                {[["🔥",1],["💀",-1]].map(([icon,d])=>(
                  <button key={icon} className="btn" onClick={()=>doVote(msg.id,d)}
                    style={{background:vid===d?"rgba(255,23,68,.2)":"rgba(255,255,255,.05)",border:`1px solid ${vid===d?"rgba(255,23,68,.3)":"var(--b1)"}`,borderRadius:8,padding:"3px 8px",color:vid===d?"var(--red)":"var(--t3)",fontSize:10,cursor:"pointer",opacity:(vid&&vid!==d)?.4:1}}>
                    {icon}{icon==="🔥"&&(msg.votes||0)>0?` ${msg.votes}`:""}
                  </button>
                ))}
                {!isMe&&!msg.isAI&&(
                  <button className="btn" onClick={()=>doReport(msg.id)}
                    style={{background:"none",border:"none",color:reported[msg.id]?"var(--red)":"var(--t3)",fontSize:11,cursor:"pointer",padding:"3px 5px",opacity:.6}}>
                    🚩
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {roasts.filter(r=>!r.hidden).length===0&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 0",color:"var(--t3)"}}>
            <div style={{fontSize:40,marginBottom:12}}>😶</div>
            <div style={{fontSize:13,fontWeight:600}}>Dead silent in here</div>
            <div style={{fontSize:11,marginTop:4}}>Be the first to fire a roast 💀</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:"10px 12px 14px",background:"rgba(7,7,14,.98)",borderTop:"1px solid var(--b1)",flexShrink:0}}>
        {blocked&&<div className="shake" style={{background:"rgba(255,23,68,.1)",border:"1px solid rgba(255,23,68,.25)",borderRadius:10,padding:"8px 12px",marginBottom:8,fontSize:11,color:"var(--red)",textAlign:"center"}}>🚫 Blocked — Cricket banter only, no hate speech</div>}
        {!isPro&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontSize:10,color:roastsLeft<=0?"var(--red)":"var(--t3)"}}>{roastsLeft<=0?"No roasts left today":""+roastsLeft+" free roasts left"}</span>
            <button className="btn" onClick={()=>setShowPro(true)} style={{background:"none",border:"none",color:"var(--red)",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>UPGRADE →</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{flex:1,background:"var(--s2)",border:`1px solid ${blocked?"rgba(255,23,68,.4)":"var(--b2)"}`,borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",gap:8,transition:"border .2s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:MT?.c,flexShrink:0}}/>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder={`Roast ${OT?.s} fans... 💀`} maxLength={120}
              style={{flex:1,background:"none",border:"none",color:"var(--t1)",fontSize:13,fontWeight:500}}/>
            <span style={{fontSize:10,color:"var(--t3)",flexShrink:0}}>{120-input.length}</span>
          </div>
          <button className="btn" onClick={roastsLeft<=0&&!isPro?()=>setShowPro(true):send} disabled={!input.trim()||sending}
            style={{width:46,height:46,borderRadius:14,background:input.trim()&&!sending?"var(--red)":"var(--s3)",border:"none",color:"#fff",fontSize:20,cursor:input.trim()&&!sending?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s",boxShadow:input.trim()?"0 4px 16px rgba(255,23,68,.35)":"none"}}>
            {sending?<span className="spin" style={{display:"inline-block",fontSize:14}}>⏳</span>:"🔥"}
          </button>
        </div>
        <div style={{fontSize:9,color:"var(--t3)",marginTop:5,textAlign:"center"}}>AI moderated · Not affiliated with BCCI</div>
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
    <div style={{padding:"20px 16px 32px"}}>
      {/* Profile card */}
      <div className="fu" style={{background:`linear-gradient(135deg,${isPro?"rgba(255,214,0,.08)":"rgba(255,23,68,.06)"},var(--s1))`,border:`1px solid ${isPro?"rgba(255,214,0,.2)":"var(--b1)"}`,borderRadius:20,padding:"24px 20px",marginBottom:16,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:20,background:isPro?"linear-gradient(135deg,var(--gold),#ff9800)":"linear-gradient(135deg,var(--red),#ff6b6b)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:28,fontWeight:800,boxShadow:`0 8px 24px ${isPro?"rgba(255,214,0,.3)":"rgba(255,23,68,.3)"}`}}>
          {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",borderRadius:20,objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
        </div>
        <div className="cd" style={{fontSize:24,fontWeight:700,marginBottom:4}}>{user?.name}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:isPro?"rgba(255,214,0,.1)":"rgba(255,255,255,.06)",border:`1px solid ${isPro?"rgba(255,214,0,.2)":"var(--b1)"}`,borderRadius:20,padding:"5px 14px",fontSize:12,color:isPro?"var(--gold)":"var(--t2)",fontWeight:700}}>
          {isPro?"👑 PRO MEMBER":"🔓 FREE PLAN"}
        </div>
      </div>

      {/* Plan features */}
      {!isPro && (
        <div className="fu glass" style={{padding:"20px",marginBottom:16,animationDelay:".1s"}}>
          <div className="cd" style={{fontSize:16,marginBottom:16,color:"var(--t1)"}}>FREE PLAN</div>
          {[["✅","Live scores — all matches"],["✅","War room — read all roasts"],["⚡","3 roasts per day only"],["🔒","Win predictions — locked"],["🔒","AI Roast button — locked"],["📢","Ads shown"]].map(([i,f])=>(
            <div key={f} style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
              <span style={{fontSize:14,width:20,textAlign:"center"}}>{i}</span>
              <span style={{fontSize:12,color:f.includes("locked")||f.includes("only")||f.includes("Ads")?"var(--t3)":"var(--t2)"}}>{f}</span>
            </div>
          ))}
          <button className="btn" onClick={()=>setShowPro(true)}
            style={{width:"100%",marginTop:12,background:"var(--red)",borderRadius:12,padding:"13px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:.5,boxShadow:"0 4px 16px rgba(255,23,68,.3)"}}>
            Upgrade to Pro — ₹49/month 👑
          </button>
        </div>
      )}

      {isPro && (
        <div className="fu glass" style={{padding:"20px",marginBottom:16,background:"rgba(255,214,0,.04)",border:"1px solid rgba(255,214,0,.15)",animationDelay:".1s"}}>
          <div className="cd" style={{fontSize:16,marginBottom:16,color:"var(--gold)"}}>👑 PRO MEMBER</div>
          {[["✅","Unlimited roasts every match"],["✅","AI Roast button — 10/day"],["✅","Win predictions voting"],["✅","Zero ads"],["✅","Man of the Match badge"]].map(([i,f])=>(
            <div key={f} style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
              <span style={{fontSize:14}}>{i}</span>
              <span style={{fontSize:12,color:"var(--t2)"}}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="fu" style={{display:"flex",flexDirection:"column",gap:8,animationDelay:".2s"}}>
        <button className="btn" onClick={onLogout}
          style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:"13px",color:"var(--t2)",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Sign Out
        </button>
        <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",lineHeight:1.7}}>
          CricRoar is not affiliated with BCCI or IPL · Fan platform only
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
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="su" style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:"24px 24px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",position:"relative"}}>
        <button className="btn" onClick={onClose} style={{position:"absolute",top:16,right:16,background:"var(--s2)",border:"none",borderRadius:"50%",width:32,height:32,color:"var(--t2)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:8}}>👑</div>
          <div className="cd" style={{fontSize:30,fontWeight:700,color:"var(--gold)",marginBottom:6}}>GO PRO</div>
          <div style={{fontSize:13,color:"var(--t2)"}}>Unlock the full CricRoar experience</div>
        </div>
        <div style={{marginBottom:24}}>
          {[["⚔️","Unlimited roasts every match","Free: 3/day only"],["🤖","AI Roast button","Free: locked"],["📊","Vote on win predictions","Free: view only"],["🚫","Zero ads forever","Free: ads shown"],["🏆","Man of the Match badge","Free: locked"],["📱","Works across all your devices","Free: same"]].map(([i,f,sub])=>(
            <div key={f} style={{display:"flex",gap:12,alignItems:"center",padding:"11px 0",borderBottom:"1px solid var(--b1)"}}>
              <span style={{fontSize:20,width:28,textAlign:"center"}}>{i}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{f}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{sub}</div>
              </div>
              <span style={{fontSize:16}}>✅</span>
            </div>
          ))}
        </div>
        <button className="btn" onClick={onBuy}
          style={{width:"100%",background:"linear-gradient(135deg,var(--red),#ff6b35)",borderRadius:16,padding:"17px",color:"#fff",fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:700,cursor:"pointer",letterSpacing:1,boxShadow:"0 8px 32px rgba(255,23,68,.4)"}}>
          ₹49 / MONTH — UNLOCK NOW
        </button>
        <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",marginTop:10}}>Cancel anytime · Secure payment via Razorpay · Auto-renews monthly</div>
      </div>
    </div>
  );
}
