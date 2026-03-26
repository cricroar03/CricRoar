import { TEAMS } from "./config.js";
import { TeamBadge } from "./ScoresTab.jsx";

const timeAgo = ts => {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s/60)}m`; return `${Math.floor(s/3600)}h`;
};

function TeamPicker({ match, onPick, onBack }) {
  const teams = [match.t1, match.t2];
  return (
    <div style={{padding:"16px 16px 40px"}}>
      <button className="btn" onClick={onBack} style={{background:"none",border:"none",color:"var(--t2)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:24,padding:0}}>← Back to matches</button>
      <div className="si" style={{textAlign:"center",marginBottom:8}}>
        <div className="bc" style={{fontSize:36,color:"var(--t1)",lineHeight:1}}>WHOSE SIDE<br/>ARE YOU ON?</div>
      </div>
      <div style={{fontSize:12,color:"var(--t3)",textAlign:"center",marginBottom:28,fontWeight:500}}>Pick your team. Your roasts represent them in the War Room.</div>
      <div style={{display:"flex",gap:12}}>
        {teams.map((tk, i) => {
          const t = TEAMS[tk]||{s:tk,c:"#888",a:"#fff",g:"135deg,#888,#444",n:tk};
          const score = i===0?match.s1:match.s2; const overs = i===0?match.ov1:match.ov2;
          return (
            <button key={tk} className="btn fu" onClick={()=>onPick(tk)} style={{flex:1,background:`linear-gradient(${t.g})`,borderRadius:20,padding:"28px 12px 24px",textAlign:"center",border:"none",cursor:"pointer",position:"relative",overflow:"hidden",animationDelay:`${i*.1}s`,boxShadow:`0 12px 36px ${t.c}40`}}>
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)"}}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{width:56,height:56,borderRadius:16,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",backdropFilter:"blur(4px)"}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:"#fff",letterSpacing:.5}}>{t.s}</span>
                </div>
                <div className="bc" style={{fontSize:26,color:"#fff",lineHeight:1,marginBottom:4,letterSpacing:.5}}>{t.s}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.55)",marginBottom:score?12:18,fontWeight:600,lineHeight:1.4}}>{t.n}</div>
                {score && <div style={{fontSize:15,color:"rgba(255,255,255,.9)",fontWeight:800,marginBottom:14}}>{score} <span style={{fontSize:9,opacity:.6}}>({overs} ov)</span></div>}
                <div style={{background:"rgba(255,255,255,.18)",backdropFilter:"blur(6px)",borderRadius:10,padding:"9px 12px",fontSize:11,color:"#fff",fontWeight:800,border:"1px solid rgba(255,255,255,.25)"}}>I AM {t.s}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",marginTop:16,fontWeight:500}}>Not affiliated with BCCI or IPL · Fan platform only</div>
    </div>
  );
}

function ChatMsg({ msg, myTeam, voted, reported, onVote, onReport }) {
  const name = msg.uname||msg.user_name||"Fan";
  const mt = TEAMS[msg.team]||{s:msg.team,c:"#888",a:"#fff",g:"135deg,#888,#555"};
  const isMe = msg.team===myTeam; const vid=voted[msg.id]; const isRepd=reported[msg.id];
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",animation:"fadeUp .22s ease-out both"}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,[isMe?"marginRight":"marginLeft"]:4}}>
        <div style={{width:14,height:14,borderRadius:3,background:`linear-gradient(${mt.g})`,flexShrink:0}}/>
        <span style={{fontSize:9,color:mt.c,fontWeight:800,letterSpacing:.2}}>{name}</span>
        {msg.isAI && <span style={{fontSize:7,background:"rgba(26,43,109,.1)",color:"var(--navy)",borderRadius:3,padding:"1px 5px",fontWeight:800}}>AI</span>}
        <span style={{fontSize:8,color:"var(--t3)",fontWeight:500}}>{timeAgo(msg.ts||Date.now())}</span>
      </div>
      <div style={{
        maxWidth:"82%",
        background:msg.isAI?"rgba(26,43,109,.06)":isMe?`linear-gradient(${mt.g})`:"var(--card)",
        border:`1px solid ${msg.isAI?"rgba(26,43,109,.12)":isMe?mt.c+"20":"var(--border)"}`,
        borderRadius:isMe?"14px 4px 14px 14px":"4px 14px 14px 14px",
        padding:"10px 13px", position:"relative",
        boxShadow:isMe?`0 2px 12px ${mt.c}18`:msg.isAI?"0 2px 10px rgba(26,43,109,.08)":"var(--shadow)",
      }}>
        {isMe && <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.22)",borderRadius:"inherit"}}/>}
        <div style={{position:"relative",zIndex:1,fontSize:13,color:isMe?"#fff":"var(--t1)",lineHeight:1.5,fontWeight:isMe?600:500}}>{msg.text}</div>
      </div>
      <div style={{display:"flex",gap:4,marginTop:4,[isMe?"marginRight":"marginLeft"]:4}}>
        {[["🔥",1],["💀",-1]].map(([icon,d])=>(
          <button key={icon} className="btn" onClick={()=>onVote(msg.id,d)} style={{background:vid===d?`${mt.c}14`:"var(--card2)",border:`1px solid ${vid===d?mt.c+"30":"var(--border)"}`,borderRadius:7,padding:"3px 8px",color:vid===d?mt.c:"var(--t3)",fontSize:9,fontWeight:800,cursor:"pointer",opacity:vid&&vid!==d?.35:1,boxShadow:"var(--shadow)"}}>
            {icon}{icon==="🔥"&&(msg.votes||0)>0?` ${msg.votes}`:""}
          </button>
        ))}
        {!isMe&&!msg.isAI&&<button className="btn" onClick={()=>onReport(msg.id)} style={{background:"none",border:"none",color:isRepd?"var(--red)":"var(--t3)",fontSize:10,cursor:"pointer",padding:"3px 5px",opacity:.5}}>⚑</button>}
      </div>
    </div>
  );
}

export default function WarTab({match,selMatch,myTeam,setMyTeam,setSelMatch,matches,T1,T2,MT,OT,oppKey,roasts,input,setInput,send,sending,blocked,doVote,doReport,voted,reported,doAI,aiLoad,aiToast,topR,meter,myPct,isPro,roastsLeft,chatRef,setShowPro}) {
  if (!selMatch) return (
    <div style={{padding:"14px 14px 70px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"0 2px"}}>
        <div style={{width:4,height:18,background:"linear-gradient(180deg,var(--navy),var(--orange))",borderRadius:2}}/>
        <span style={{fontSize:14,fontWeight:800,color:"var(--t1)"}}>Pick a War Room</span>
      </div>
      {matches.map((m,i)=>{
        const t1=TEAMS[m.t1]||{s:m.t1,c:"#888",g:"135deg,#888,#444"};
        const t2=TEAMS[m.t2]||{s:m.t2,c:"#888",g:"135deg,#888,#444"};
        return (
          <div key={m.id} className="btn fu" onClick={()=>setSelMatch(m.id)} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14,animationDelay:`${i*.06}s`,boxShadow:"var(--shadow)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:`linear-gradient(${t1.g})`}}/>
            <div style={{paddingLeft:12,flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span className="bc" style={{fontSize:18,color:t1.c,letterSpacing:.5}}>{t1.s}</span>
                <span style={{fontSize:10,color:"var(--t3)",fontWeight:600}}>vs</span>
                <span className="bc" style={{fontSize:18,color:t2.c,letterSpacing:.5}}>{t2.s}</span>
                {m.status==="LIVE"&&<div style={{width:7,height:7,borderRadius:"50%",background:"#DC2626",position:"relative"}}><div style={{position:"absolute",inset:0,borderRadius:"50%",background:"#DC2626",animation:"livePing 1.5s ease-out infinite",opacity:.7}}/></div>}
              </div>
              <div style={{fontSize:9,color:"var(--t3)",fontWeight:500}}>{m.venue}</div>
            </div>
            <div style={{fontSize:14,color:"var(--navy)",fontWeight:800}}>→</div>
          </div>
        );
      })}
    </div>
  );

  if (!myTeam&&match) return <TeamPicker match={match} onPick={setMyTeam} onBack={()=>setSelMatch(null)}/>;
  if (!match||!MT||!OT) return null;

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {/* War header */}
      <div style={{padding:"10px 14px 10px",background:"var(--surface)",borderBottom:"1px solid var(--border)",flexShrink:0,boxShadow:"0 1px 4px rgba(15,23,42,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
          <button className="btn" onClick={()=>setMyTeam(null)} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,width:32,height:32,color:"var(--t2)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--shadow)"}}>←</button>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <TeamBadge teamKey={match.t1} size={20}/>
              <span className="bc" style={{fontSize:17,color:MT.c,letterSpacing:.5}}>{MT.s}</span>
              <span style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>vs</span>
              <span className="bc" style={{fontSize:17,color:OT.c,letterSpacing:.5}}>{OT.s}</span>
              <TeamBadge teamKey={match.t2} size={20}/>
              {match.status==="LIVE"&&<div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:10,padding:"2px 7px",marginLeft:4}}><div style={{width:5,height:5,borderRadius:"50%",background:"#DC2626",position:"relative"}}><div style={{position:"absolute",inset:0,borderRadius:"50%",background:"#DC2626",animation:"livePing 1.5s ease-out infinite",opacity:.7}}/></div><span style={{fontSize:7,color:"#DC2626",fontWeight:800,letterSpacing:1}}>LIVE</span></div>}
            </div>
            {(match.s1||match.s2)&&<div style={{fontSize:9,color:"var(--t3)",fontWeight:500}}>{match.t1}: {match.s1||"—"} · {match.t2}: {match.s2||"—"}</div>}
          </div>
          <button className="btn" onClick={doAI} disabled={aiLoad} style={{background:isPro?"rgba(26,43,109,.07)":"var(--card2)",border:`1px solid ${isPro?"rgba(26,43,109,.15)":"var(--border)"}`,borderRadius:9,padding:"7px 11px",color:isPro?"var(--navy)":"var(--t3)",fontSize:10,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0,boxShadow:"var(--shadow)"}}>
            {!isPro&&<span style={{fontSize:7,background:"var(--orange)",color:"#fff",borderRadius:3,padding:"1px 5px",fontWeight:900}}>PRO</span>}
            {aiLoad?<span className="spin" style={{fontSize:13,width:14}}>◌</span>:"AI Roast"}
          </button>
        </div>
        {/* War meter */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:9,color:MT.c,fontWeight:800}}>{MT.s} {myPct}%</span>
            <span style={{fontSize:8,color:"var(--t3)",letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>War Meter</span>
            <span style={{fontSize:9,color:OT.c,fontWeight:800}}>{100-myPct}% {OT.s}</span>
          </div>
          <div style={{height:5,borderRadius:3,background:"var(--card3)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${myPct}%`,background:`linear-gradient(90deg,${MT.c},${MT.a||MT.c})`,transition:"width 1s ease",borderRadius:3}}/>
          </div>
        </div>
      </div>

      {aiToast&&<div className="fu" style={{margin:"8px 13px 0",background:"rgba(26,43,109,.05)",border:"1px solid rgba(26,43,109,.1)",borderRadius:11,padding:"10px 13px",display:"flex",gap:10,flexShrink:0,alignItems:"flex-start"}}><span style={{fontSize:9,color:"var(--navy)",fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,whiteSpace:"nowrap",paddingTop:1}}>AI Roasted</span><div style={{fontSize:12,color:"var(--t1)",fontWeight:600,lineHeight:1.4}}>{aiToast}</div></div>}
      {topR&&<div style={{margin:"6px 13px 0",background:"rgba(217,119,6,.05)",border:"1px solid rgba(217,119,6,.12)",borderRadius:9,padding:"7px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span style={{fontSize:9,color:"var(--gold)",fontWeight:800}}>MOTR:</span><span style={{fontSize:9,color:"var(--gold)",fontWeight:700,flex:1}}>{topR.uname||topR.user_name}</span><span style={{fontSize:9,color:"var(--t3)",fontWeight:700}}>{topR.votes||0} 🔥</span></div>}

      {/* Messages */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px 13px",display:"flex",flexDirection:"column",gap:8,background:"var(--bg)"}}>
        {roasts.filter(r=>!r.hidden).map(msg=><ChatMsg key={msg.id} msg={msg} myTeam={myTeam} voted={voted} reported={reported} onVote={doVote} onReport={doReport}/>)}
        {roasts.filter(r=>!r.hidden).length===0&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:6}}><div style={{fontSize:13,fontWeight:800,color:"var(--t2)"}}>Dead silent in here</div><div style={{fontSize:12,color:"var(--t3)",fontWeight:500}}>Be the first to fire a roast</div></div>}
      </div>

      {/* Input */}
      <div style={{padding:"10px 13px 20px",background:"var(--surface)",borderTop:"1px solid var(--border)",flexShrink:0,boxShadow:"0 -1px 4px rgba(15,23,42,.05)"}}>
        {blocked&&<div className="shake" style={{background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.15)",borderRadius:9,padding:"7px 12px",marginBottom:7,fontSize:11,color:"var(--red)",textAlign:"center",fontWeight:700}}>Blocked — Keep it cricket banter only</div>}
        {!isPro&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:9,color:roastsLeft<=0?"var(--red)":"var(--t3)",fontWeight:700}}>{roastsLeft<=0?"No roasts left today":`${roastsLeft} free roasts left`}</span><button className="btn" onClick={()=>setShowPro(true)} style={{background:"none",border:"none",color:"var(--orange)",fontSize:9,fontWeight:800,cursor:"pointer"}}>UPGRADE →</button></div>}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{flex:1,background:"var(--card)",border:`2px solid ${blocked?"rgba(220,38,38,.3)":"var(--border2)"}`,borderRadius:13,padding:"11px 13px",display:"flex",alignItems:"center",gap:8,boxShadow:"var(--shadow)",transition:"border .2s"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:MT?.c,flexShrink:0}}/>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={`Roast ${OT?.s} fans...`} maxLength={120} style={{flex:1,background:"none",border:"none",color:"var(--t1)",fontSize:13,fontWeight:500}} onFocus={e=>e.target.parentNode.style.borderColor="var(--navy)"} onBlur={e=>e.target.parentNode.style.borderColor=blocked?"rgba(220,38,38,.3)":"var(--border2)"}/>
            <span style={{fontSize:9,color:"var(--t3)",flexShrink:0,fontWeight:600}}>{120-input.length}</span>
          </div>
          <button className="btn" onClick={roastsLeft<=0&&!isPro?()=>setShowPro(true):send} disabled={!input.trim()||sending} style={{width:46,height:46,borderRadius:13,background:input.trim()&&!sending?"linear-gradient(135deg,var(--navy),#2D46B5)":"var(--card2)",border:`1px solid ${input.trim()&&!sending?"var(--navy)":"var(--border)"}`,color:input.trim()?"#fff":"var(--t3)",fontSize:17,cursor:input.trim()&&!sending?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .18s",boxShadow:input.trim()?"0 4px 16px rgba(26,43,109,.3)":"none"}}>
            {sending?<span className="spin" style={{fontSize:13}}>◌</span>:"↑"}
          </button>
        </div>
        <div style={{fontSize:8,color:"var(--t3)",marginTop:6,textAlign:"center",fontWeight:500}}>AI moderated · Not affiliated with BCCI or IPL</div>
      </div>
    </div>
  );
}
