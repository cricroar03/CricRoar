import { TEAMS } from "./config.js";

// ── Team Badge SVG component ─────────────────────────────────
export function TeamBadge({ teamKey, size = 44 }) {
  const t = TEAMS[teamKey];
  if (!t) return <div style={{width:size,height:size,borderRadius:size*.22,background:"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.2,fontWeight:900,color:"#9CA3AF"}}>{teamKey?.slice(0,2)}</div>;
  const r = size * 0.22;
  const fs = size <= 36 ? size * .26 : size <=48 ? size * .23 : size * .21;
  return (
    <div style={{
      width:size, height:size, borderRadius:r,
      background:`linear-gradient(${t.g})`,
      display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0, position:"relative", overflow:"hidden",
      boxShadow:`0 3px 10px ${t.c}35`,
    }}>
      {/* Gloss overlay */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:"rgba(255,255,255,.15)",borderRadius:`${r}px ${r}px 50% 50%`}}/>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:fs,fontWeight:900,color:"#fff",letterSpacing:.5,position:"relative",zIndex:1,textShadow:"0 1px 3px rgba(0,0,0,.3)"}}>{t.s}</span>
    </div>
  );
}

// ── Pill Badges ───────────────────────────────────────────────
function LiveBadge() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:20,padding:"3px 10px"}}>
      <div style={{width:6,height:6,borderRadius:"50%",background:"#DC2626",position:"relative"}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"#DC2626",animation:"livePing 1.5s ease-out infinite",opacity:.7}}/>
      </div>
      <span style={{fontSize:9,color:"#DC2626",fontWeight:800,letterSpacing:1.5}}>LIVE</span>
    </div>
  );
}

// ── Prediction bar ────────────────────────────────────────────
function PredBar({ t1Key, t2Key, pct }) {
  const t1 = TEAMS[t1Key] || { s:t1Key, c:"#888", a:"#fff" };
  const t2 = TEAMS[t2Key] || { s:t2Key, c:"#888", a:"#fff" };
  const p1 = Math.round(pct); const p2 = 100-p1;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <span style={{fontSize:10,color:t1.c,fontWeight:800}}>{t1.s} {p1}%</span>
        <span style={{fontSize:9,color:"var(--t3)",letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>Fan Prediction</span>
        <span style={{fontSize:10,color:t2.c,fontWeight:800}}>{p2}% {t2.s}</span>
      </div>
      <div style={{height:5,borderRadius:3,background:"var(--card3)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${p1}%`,background:`linear-gradient(90deg,${t1.c},${t1.a||t1.c})`,transition:"width 1s ease",borderRadius:3}}/>
      </div>
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────
function MatchCard({ m, pred, voted, isPro, delay, onClick, doPredict, setShowPro }) {
  const t1 = TEAMS[m.t1] || { s:m.t1||"?", c:"#888", a:"#fff", g:"135deg,#888,#444", n:m.t1||"Team 1" };
  const t2 = TEAMS[m.t2] || { s:m.t2||"?", c:"#888", a:"#fff", g:"135deg,#888,#444", n:m.t2||"Team 2" };
  const isLive = m.status === "LIVE";

  return (
    <div className="btn fu" onClick={onClick} style={{
      background:"var(--card)", borderRadius:18, marginBottom:12, overflow:"hidden",
      boxShadow:isLive?"0 2px 6px rgba(220,38,38,.08),0 8px 28px rgba(220,38,38,.06)":"var(--shadow)",
      border:`1px solid ${isLive?"rgba(220,38,38,.15)":"var(--border)"}`,
      animationDelay:`${delay}s`, cursor:"pointer",
    }}>
      {/* Top color stripe */}
      <div style={{height:3,background:`linear-gradient(90deg,${t1.c} 50%,${t2.c} 50%)`}}/>

      {/* Status bar */}
      <div style={{padding:"9px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)",background:isLive?"rgba(220,38,38,.025)":"transparent"}}>
        <div style={{fontSize:9,color:"var(--t3)",fontWeight:600,flex:1,marginRight:8}}>{m.venue}</div>
        {isLive && <LiveBadge/>}
        {m.status==="TODAY"    && <div style={{background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.2)",borderRadius:16,padding:"2px 9px",fontSize:8,color:"var(--gold)",fontWeight:800,letterSpacing:1,whiteSpace:"nowrap"}}>TODAY · {m.time}</div>}
        {m.status==="UPCOMING" && <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:16,padding:"2px 9px",fontSize:8,color:"var(--t3)",fontWeight:700,whiteSpace:"nowrap"}}>{m.time}</div>}
        {m.status==="ENDED"    && <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:16,padding:"2px 9px",fontSize:8,color:"var(--t3)",fontWeight:700}}>COMPLETED</div>}
      </div>

      <div style={{padding:"16px 16px 14px"}}>
        {/* Team 1 */}
        <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
            <TeamBadge teamKey={m.t1} size={44}/>
            <div>
              <div className="bc" style={{fontSize:20,color:t1.c,lineHeight:1,letterSpacing:.5}}>{t1.s}</div>
              <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginTop:1}}>{t1.n.split(" ").slice(-1)[0]}</div>
            </div>
          </div>
          {m.s1 ? (
            <div style={{textAlign:"right"}}>
              <div className="bc" style={{fontSize:24,color:"var(--t1)",lineHeight:1,fontWeight:700}}>{m.s1}</div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{m.ov1} ov</div>
            </div>
          ) : <div style={{fontSize:13,color:"var(--t3)",fontWeight:600}}>—</div>}
        </div>

        {/* VS Divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
          <span style={{fontSize:9,color:"var(--t3)",fontWeight:700,letterSpacing:2}}>VS</span>
          {m.target && <span style={{fontSize:9,color:"var(--t2)",fontWeight:700}}>Target {m.target}</span>}
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
        </div>

        {/* Team 2 */}
        <div style={{display:"flex",alignItems:"center",marginBottom:pred||isLive?14:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
            <TeamBadge teamKey={m.t2} size={44}/>
            <div>
              <div className="bc" style={{fontSize:20,color:t2.c,lineHeight:1,letterSpacing:.5}}>{t2.s}</div>
              <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginTop:1}}>{t2.n.split(" ").slice(-1)[0]}</div>
            </div>
          </div>
          {m.s2 ? (
            <div style={{textAlign:"right"}}>
              <div className="bc" style={{fontSize:24,color:"var(--t1)",lineHeight:1,fontWeight:700}}>{m.s2}</div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{m.ov2} ov</div>
            </div>
          ) : <div style={{fontSize:13,color:"var(--t3)",fontWeight:600}}>—</div>}
        </div>

        {/* Prediction bar */}
        {pred && <div style={{marginBottom:isLive?12:0}}><PredBar t1Key={m.t1} t2Key={m.t2} pct={pred.t1}/></div>}

        {/* Prediction buttons */}
        {isLive && (
          <div style={{display:"flex",gap:8}}>
            {[m.t1,m.t2].map(tk => {
              const t = TEAMS[tk]||{s:tk,c:"#888",g:"135deg,#888,#555"};
              const isV = voted===tk;
              return (
                <button key={tk} className="btn" onClick={e=>{e.stopPropagation();doPredict(m.id,tk);}}
                  style={{flex:1,borderRadius:10,padding:"9px 6px",fontSize:11,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:isV?`linear-gradient(${t.g})`:"var(--card2)",border:`1.5px solid ${isV?t.c:"var(--border)"}`,color:isV?"#fff":"var(--t2)",boxShadow:isV?`0 3px 12px ${t.c}30`:"none"}}>
                  {!isPro&&!isV&&<span style={{fontSize:7,background:"var(--orange)",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:900}}>PRO</span>}
                  {isV?"✓ ":""}{t.s} wins
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{padding:"9px 16px",background:"var(--card2)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>Fan War Room</div>
        <div style={{fontSize:9,color:"var(--navy)",fontWeight:800}}>Join Roast →</div>
      </div>
    </div>
  );
}

// ── No API key placeholder ─────────────────────────────────
function NoScores() {
  return (
    <div style={{margin:"40px 16px",background:"var(--card)",borderRadius:18,padding:"32px 20px",textAlign:"center",boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
      <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#1A2B6D,#2D46B5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div style={{fontSize:15,fontWeight:800,color:"var(--t1)",marginBottom:6}}>Live Scores Loading</div>
      <div style={{fontSize:12,color:"var(--t3)",fontWeight:500,lineHeight:1.6}}>Add your <strong>VITE_CRICKET_API</strong> key in Vercel<br/>to see real IPL 2026 match scores.</div>
    </div>
  );
}

// ── Scores Tab ────────────────────────────────────────────────
export default function ScoresTab({ matches, isLoading, preds, userPred, isPro, onMatchClick, doPredict, setShowPro, hasApiKey }) {
  return (
    <div style={{padding:"14px 14px 70px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"0 2px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:4,height:18,background:"linear-gradient(180deg,var(--navy),var(--orange))",borderRadius:2}}/>
          <span style={{fontSize:14,fontWeight:800,color:"var(--t1)"}}>All Matches</span>
        </div>
        {hasApiKey && <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>Auto-refreshes every 30s</div>}
      </div>

      {!hasApiKey ? <NoScores/> : 
       isLoading ? (
         <div style={{padding:40,textAlign:"center"}}><span className="spin" style={{fontSize:24}}>◌</span><div style={{fontSize:12,marginTop:8,color:"var(--t3)",fontWeight:500}}>Loading matches...</div></div>
       ) : 
       matches.length === 0 ? (
         <div style={{margin:"40px 16px",background:"var(--card)",borderRadius:18,padding:"32px 20px",textAlign:"center",boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
           <div style={{fontSize:15,fontWeight:800,color:"var(--navy)",marginBottom:6}}>No live matches currently</div>
           <div style={{fontSize:12,color:"var(--t3)",fontWeight:500}}>Check back later for cricket action.</div>
         </div>
       ) : matches.map((m,i) => (
        <MatchCard key={m.id} m={m} pred={preds[m.id]} voted={userPred[m.id]} isPro={isPro} delay={i*.06}
          onClick={()=>onMatchClick(m.id)} doPredict={doPredict} setShowPro={setShowPro}/>
      ))}
    </div>
  );
}
