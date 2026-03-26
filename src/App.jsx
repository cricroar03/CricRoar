import { useState, useEffect, useRef } from "react";
import { GLOBAL_CSS } from "./styles.js";
import { CFG, TEAMS, FREE_LIMIT, uid, today } from "./config.js";
import { makeSB, moderate, genRoast, fetchScores, payRazorpay } from "./services.js";
import Splash from "./Splash.jsx";
import Login from "./Login.jsx";
import ScoresTab from "./ScoresTab.jsx";
import WarTab from "./WarTab.jsx";
import MatchScreen from "./MatchScreen.jsx";
import ProfileTab from "./ProfileTab.jsx";
import ProModal from "./ProModal.jsx";

const NAV = [
  ["scores",  "Scores",
    <svg key="s" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>],
  ["war",     "War Room",
    <svg key="w" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>],
  ["profile", "Profile",
    <svg key="p" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>],
];

export default function App() {
  const [page,      setPage]      = useState("splash");
  const [tab,       setTab]       = useState("scores");
  const [user,      setUser]      = useState(null);
  const [matches,   setMatches]   = useState([]);
  const [selMatch,  setSelMatch]  = useState(null);
  const [myTeam,    setMyTeam]    = useState(null);
  const [roasts,    setRoasts]    = useState([]);
  const [preds,     setPreds]     = useState({});
  const [userPred,  setUserPred]  = useState({});
  const [input,     setInput]     = useState("");
  const [meter,     setMeter]     = useState(50);
  const [sending,   setSending]   = useState(false);
  const [blocked,   setBlocked]   = useState(false);
  const [aiLoad,    setAiLoad]    = useState(false);
  const [aiToast,   setAiToast]   = useState(null);
  const [voted,     setVoted]     = useState({});
  const [reported,  setReported]  = useState({});
  const [showPro,   setShowPro]   = useState(false);
  const [paidOk,    setPaidOk]    = useState(false);
  const [authErr,   setAuthErr]   = useState("");
  const chatRef = useRef(null);
  const sbRef   = useRef(CFG.SUPABASE_URL ? makeSB(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null);
  const sb      = sbRef.current;
  const isDemo  = !sb;
  const hasApiKey = !!CFG.CRICKET_API;

  const match  = matches.find(m => m.id === selMatch);
  const T1     = match ? (TEAMS[match.t1]||{s:match.t1,c:"#888",a:"#fff",g:"135deg,#888,#444",n:match.t1}) : null;
  const T2     = match ? (TEAMS[match.t2]||{s:match.t2,c:"#888",a:"#fff",g:"135deg,#888,#444",n:match.t2}) : null;
  const MT     = myTeam ? (TEAMS[myTeam]||{s:myTeam,c:"#888",a:"#fff",g:"135deg,#888,#444"}) : null;
  const OT     = myTeam&&match ? (myTeam===match.t1?T2:T1) : null;
  const oppKey = myTeam&&match ? (myTeam===match.t1?match.t2:match.t1) : null;
  const topR   = [...roasts].sort((a,b)=>(b.votes||0)-(a.votes||0))[0];
  const isPro  = user?.plan === "pro";
  const roastsLeft = isPro ? 999 : FREE_LIMIT - (user?.last_roast_date===today() ? (user?.roasts_today||0) : 0);
  const myPct  = Math.round(meter);

  // ── Init / Auth ────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      const stored = localStorage.getItem("cr_user");
      if (stored) {
        try { const u=JSON.parse(stored); setUser(u); setPage("main"); return; } catch {}
      }
      if (sb) {
        sb.getSession().then(sess => {
          if (sess?.user) {
            const u = {
              id: sess.user.id,
              name: sess.user.user_metadata?.full_name||sess.user.email?.split("@")[0]||"Fan",
              plan: "free", roasts_today:0, last_roast_date:"",
              avatar: sess.user.user_metadata?.avatar_url||null,
              email: sess.user.email||"",
            };
            localStorage.setItem("cr_user", JSON.stringify(u));
            setUser(u); setPage("main");
            sb.upsertUser(u);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else { setPage("login"); }
        });
      } else { setPage("login"); }
    }, 1800);
  }, []);

  // ── Live scores (only when logged in) ─────────────────────
  useEffect(() => {
    if (!user || !hasApiKey) return;
    fetchScores().then(d => { if (d?.length) setMatches(d); });
    const t = setInterval(() => fetchScores().then(d => { if (d?.length) setMatches(d); }), 30000);
    return () => clearInterval(t);
  }, [user, hasApiKey]);

  // ── Roasts ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selMatch||!user) return;
    if (isDemo) return;
    sb.getRoasts(selMatch).then(setRoasts);
    return sb.poll(selMatch, setRoasts);
  }, [selMatch, user, isDemo]);

  // ── Predictions ────────────────────────────────────────────
  useEffect(() => {
    if (!selMatch||isDemo||!user) return;
    sb.getPreds(selMatch).then(rows => {
      if (!rows.length) return;
      const c={}; rows.forEach(r=>{c[r.team]=(c[r.team]||0)+1;});
      const tot=Object.values(c).reduce((a,b)=>a+b,0);
      if (tot>0) {
        const t1p=Math.round(((c[match?.t1]||0)/tot)*100);
        setPreds(p=>({...p,[selMatch]:{t1:t1p,t2:100-t1p}}));
      }
    });
  }, [selMatch, user]);

  useEffect(() => { chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:"smooth"}); }, [roasts]);

  useEffect(() => {
    if (page!=="main") return;
    const t=setInterval(()=>setMeter(p=>Math.max(20,Math.min(80,p+(Math.random()-.5)*3))),3000);
    return ()=>clearInterval(t);
  }, [page]);

  useEffect(() => {
    if (document.getElementById("rzp-script")) return;
    const s=document.createElement("script"); s.id="rzp-script"; s.src="https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(s);
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const loginGoogle = () => {
    if (isDemo) { setAuthErr("Supabase not connected — use Guest mode for now"); return; }
    setAuthErr(""); sb.signInGoogle();
  };
  const loginGuest = (name) => {
    const u={id:uid(),name,plan:"free",roasts_today:0,last_roast_date:"",avatar:null,email:""};
    localStorage.setItem("cr_user",JSON.stringify(u)); setUser(u); setPage("main");
    if (!isDemo) sb.upsertUser(u);
  };
  const send = async () => {
    if (!input.trim()||!myTeam||!selMatch||sending) return;
    if (!isPro&&roastsLeft<=0) { setShowPro(true); return; }
    setSending(true); setBlocked(false);
    const verdict = await moderate(input.trim());
    if (verdict==="BLOCK") { setBlocked(true); setSending(false); setTimeout(()=>setBlocked(false),3000); return; }
    const msg={match_id:selMatch,uid:user?.id||"anon",uname:user?.name||"Fan",team:myTeam,text:input.trim(),votes:0,reports:0,hidden:false,ts:Date.now()};
    setInput("");
    setRoasts(p=>[...p,{...msg,id:"p_"+Date.now()}]);
    if (!isDemo) sb.postRoast({match_id:msg.match_id,user_id:msg.uid,user_name:msg.uname,team:msg.team,text:msg.text,votes:0,reports:0,hidden:false});
    if (!isPro&&user) {
      const isNew=user.last_roast_date!==today();
      const nu={...user,roasts_today:isNew?1:(user.roasts_today||0)+1,last_roast_date:today()};
      setUser(nu); localStorage.setItem("cr_user",JSON.stringify(nu));
      if (!isDemo) sb.upsertUser(nu);
    }
    setMeter(p=>myTeam===match?.t1?Math.min(82,p+4):Math.max(18,p-4));
    setSending(false);
  };
  const doVote = (id,d) => {
    if (voted[id]) return;
    setVoted(p=>({...p,[id]:d}));
    setRoasts(p=>p.map(m=>m.id===id?{...m,votes:(m.votes||0)+d}:m));
    if (!isDemo) { const m=roasts.find(x=>x.id===id); if(m) sb.patchVotes(id,(m.votes||0)+d); }
  };
  const doReport = (id) => {
    if (reported[id]) return;
    setReported(p=>({...p,[id]:true}));
    setRoasts(p=>p.map(m=>{ if(m.id!==id)return m; const nr=(m.reports||0)+1; return {...m,reports:nr,hidden:nr>=3}; }));
    if (!isDemo) { const m=roasts.find(x=>x.id===id); if(m) sb.patchReport(id,(m.reports||0)+1,(m.reports||0)+1>=3); }
  };
  const doAI = async () => {
    if (!isPro) { setShowPro(true); return; }
    if (!oppKey) return;
    setAiLoad(true);
    const r = await genRoast(oppKey);
    if (r) {
      setRoasts(p=>[...p,{id:"ai_"+Date.now(),match_id:selMatch,uid:"bot",uname:"RoastBot AI",team:myTeam,text:r,votes:0,reports:0,hidden:false,ts:Date.now(),isAI:true}]);
      setAiToast(r); setTimeout(()=>setAiToast(null),6000);
    }
    setAiLoad(false);
  };
  const doPredict = (mid,team) => {
    if (!isPro) { setShowPro(true); return; }
    if (userPred[mid]) return;
    setUserPred(p=>({...p,[mid]:team}));
    const m=matches.find(x=>x.id===mid);
    const prev=preds[mid]||{t1:50,t2:50};
    const isT1=team===m?.t1;
    const newT1=isT1?Math.min(88,prev.t1+5):Math.max(12,prev.t1-5);
    setPreds(p=>({...p,[mid]:{t1:newT1,t2:100-newT1}}));
    if (!isDemo&&user) sb.postPred({match_id:mid,user_id:user.id,team,value:1});
  };
  const buyPro = () => {
    payRazorpay(user?.id,user?.name,user?.email,()=>{
      const nu={...user,plan:"pro"};
      setUser(nu); localStorage.setItem("cr_user",JSON.stringify(nu));
      if (!isDemo&&user) sb.upsertUser(nu);
      setShowPro(false); setPaidOk(true); setTimeout(()=>setPaidOk(false),5000);
    });
  };

  // ── Render ─────────────────────────────────────────────────
  if (page==="splash") return <Splash/>;
  if (page==="login")  return <Login onGoogle={loginGoogle} onGuest={loginGuest} isDemo={isDemo} error={authErr}/>;

  if (selMatch && match) {
    const warProps = { match, selMatch, myTeam, setMyTeam, setSelMatch, matches, T1, T2, MT, OT, oppKey, roasts, input, setInput, send, sending, blocked, doVote, doReport, voted, reported, doAI, aiLoad, aiToast, topR, meter, myPct, isPro, roastsLeft, chatRef, setShowPro };
    return <MatchScreen match={match} onBack={() => {setSelMatch(null); setTab("scores");}} hasApiKey={hasApiKey} warProps={warProps} />;
  }

  return (
    <div style={{height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",flexShrink:0,boxShadow:"0 1px 4px rgba(15,23,42,.06)"}}>
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <img src="/logo.png" alt="" style={{width:32,height:32,objectFit:"contain"}}
              onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
            <div style={{display:"none",width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#1A2B6D,#FF6B00)",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:900,color:"#fff"}}>CR</span>
            </div>
            <div className="bc" style={{fontSize:22,color:"var(--navy)",letterSpacing:.5}}>CRIC<span style={{color:"var(--orange)"}}>ROAR</span></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {paidOk && <div className="pop" style={{fontSize:9,color:"var(--orange)",fontWeight:800,background:"rgba(255,107,0,.08)",border:"1px solid rgba(255,107,0,.2)",borderRadius:16,padding:"3px 10px"}}>PRO UNLOCKED</div>}
            <button className="btn" onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:6,background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 10px 5px 5px",cursor:"pointer",boxShadow:"var(--shadow)"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:isPro?"linear-gradient(135deg,#D97706,#F59E0B)":"linear-gradient(135deg,#1A2B6D,#2D46B5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",overflow:"hidden",flexShrink:0}}>
                {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:800,lineHeight:1,color:"var(--t1)"}}>{user?.name?.split(" ")[0]}</div>
                <div style={{fontSize:8,color:isPro?"var(--gold)":"var(--t3)",letterSpacing:.4,textTransform:"uppercase",fontWeight:700}}>{isPro?"PRO":"FREE"}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",padding:"0 14px 10px",gap:6}}>
          {NAV.map(([t,lb,icon])=>(
            <button key={t} className="btn" onClick={()=>setTab(t)} style={{flex:1,borderRadius:10,padding:"8px 4px",background:tab===t?"var(--navy)":"var(--card2)",border:`1.5px solid ${tab===t?"var(--navy)":"var(--border)"}`,color:tab===t?"#fff":"var(--t3)",fontSize:9,fontWeight:700,letterSpacing:.4,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .18s",boxShadow:tab===t?"0 3px 12px rgba(26,43,109,.25)":"none"}}>
              <span style={{color:"inherit",opacity:tab===t?1:.7,display:"flex"}}>{icon}</span>{lb}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:tab==="war"&&selMatch&&myTeam?"hidden":"auto",position:"relative"}}>
        {tab==="scores" && <ScoresTab matches={matches} preds={preds} userPred={userPred} isPro={isPro} onMatchClick={id=>{setSelMatch(id);setTab("war");}} doPredict={doPredict} setShowPro={setShowPro} hasApiKey={hasApiKey}/>}
        {tab==="war"    && <WarTab match={match} selMatch={selMatch} myTeam={myTeam} setMyTeam={setMyTeam} setSelMatch={setSelMatch} matches={matches} T1={T1} T2={T2} MT={MT} OT={OT} oppKey={oppKey} roasts={roasts} input={input} setInput={setInput} send={send} sending={sending} blocked={blocked} doVote={doVote} doReport={doReport} voted={voted} reported={reported} doAI={doAI} aiLoad={aiLoad} aiToast={aiToast} topR={topR} meter={meter} myPct={myPct} isPro={isPro} roastsLeft={roastsLeft} chatRef={chatRef} setShowPro={setShowPro}/>}
        {tab==="profile"&& <ProfileTab user={user} isPro={isPro} setShowPro={setShowPro} onLogout={()=>{localStorage.removeItem("cr_user");localStorage.removeItem("cr_token");setUser(null);setPage("login");}}/>}
      </div>

      {showPro && <ProModal onBuy={buyPro} onClose={()=>setShowPro(false)}/>}
    </div>
  );
}
