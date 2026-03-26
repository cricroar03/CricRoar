import { useState, useEffect } from "react";
import { fetchMatchInfo, fetchMatchScorecard, fetchMatchCommentary } from "./services.js";
import { TeamBadge } from "./ScoresTab.jsx";
import WarTab from "./WarTab.jsx";

const MATCH_TABS = [
  ["live", "Live"],
  ["scorecard", "Scorecard"],
  ["commentary", "Commentary"],
  ["war", "War Room"],
];

function FullScorecard({ sc }) {
  if (!sc || sc.length === 0) return <div style={{padding:20,textAlign:"center",color:"var(--t3)",fontSize:14}}>Scorecard unavailable</div>;
  return (
    <div style={{padding:"14px"}}>
      {sc.map((inn, i) => (
        <div key={i} className="fu" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,marginBottom:16,overflow:"hidden",boxShadow:"var(--shadow)"}}>
          <div style={{padding:"12px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:800,color:"var(--navy)"}}>{inn.inning}</span>
            <span style={{fontSize:14,fontWeight:800,color:"var(--t1)"}}>{inn.r}/{inn.w} <span style={{fontSize:11,color:"var(--t3)",fontWeight:600}}>({inn.o} ov)</span></span>
          </div>
          
          <div style={{padding:"8px 14px",background:"#F8FAFC",display:"flex",fontSize:11,fontWeight:700,color:"var(--t3)",borderBottom:"1px solid var(--border)"}}>
            <span style={{flex:3}}>Batter</span>
            <span style={{flex:1,textAlign:"right"}}>R</span>
            <span style={{flex:1,textAlign:"right"}}>B</span>
            <span style={{flex:1,textAlign:"right"}}>4s</span>
            <span style={{flex:1,textAlign:"right"}}>6s</span>
            <span style={{flex:1.5,textAlign:"right"}}>SR</span>
          </div>
          {(inn.batsman||[]).map((b, bi) => (
            <div key={bi} style={{padding:"10px 14px",display:"flex",alignItems:"center",borderBottom:"1px solid var(--border)"}}>
              <div style={{flex:3}}>
                <div style={{fontSize:13,fontWeight:700,color:b.dismissal==="batting"?"var(--orange)":"var(--t1)"}}>{b.name}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{b.dismissal==="batting"?"not out":b.dismissal||"dnb"}</div>
              </div>
              <span style={{flex:1,textAlign:"right",fontSize:13,fontWeight:800}}>{b.r}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{b.b}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{b.four}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{b.six}</span>
              <span style={{flex:1.5,textAlign:"right",fontSize:12,color:"var(--t2)"}}>{b.sr}</span>
            </div>
          ))}

          <div style={{padding:"8px 14px",background:"#F8FAFC",display:"flex",fontSize:11,fontWeight:700,color:"var(--t3)",borderBottom:"1px solid var(--border)",marginTop:8}}>
            <span style={{flex:3}}>Bowler</span>
            <span style={{flex:1,textAlign:"right"}}>O</span>
            <span style={{flex:1,textAlign:"right"}}>M</span>
            <span style={{flex:1,textAlign:"right"}}>R</span>
            <span style={{flex:1,textAlign:"right"}}>W</span>
            <span style={{flex:1.5,textAlign:"right"}}>ER</span>
          </div>
          {(inn.bowler||[]).map((bw, bwi) => (
            <div key={bwi} style={{padding:"10px 14px",display:"flex",alignItems:"center",borderBottom:bwi===inn.bowler.length-1?"none":"1px solid var(--border)"}}>
              <span style={{flex:3,fontSize:13,fontWeight:700,color:"var(--t1)"}}>{bw.name}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{bw.o}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{bw.m}</span>
              <span style={{flex:1,textAlign:"right",fontSize:12}}>{bw.r}</span>
              <span style={{flex:1,textAlign:"right",fontSize:13,fontWeight:800}}>{bw.w}</span>
              <span style={{flex:1.5,textAlign:"right",fontSize:12,color:"var(--t2)"}}>{bw.eco}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LiveTab({ match, info }) {
  if (!info) return <div style={{padding:40,textAlign:"center"}}><span className="spin" style={{fontSize:24}}>◌</span></div>;
  const currInn = info.score?.[info.score.length-1];
  
  return (
    <div className="fu" style={{padding:"14px",display:"flex",flexDirection:"column",gap:14}}>
      {/* Current Score Card */}
      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"16px",boxShadow:"var(--shadow2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:800,color:"var(--red)"}}>LIVE</span>
          <span style={{fontSize:12,fontWeight:600,color:"var(--t2)"}}>CRR: {currInn?.crr||"—"} {info.rrr ? `• RRR: ${info.rrr}` : ""}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span className="bc" style={{fontSize:42,color:"var(--t1)",lineHeight:1,letterSpacing:1}}>{currInn?.r||0}<span style={{fontSize:24,color:"var(--t3)"}}>/{currInn?.w||0}</span></span>
          <span style={{fontSize:15,fontWeight:800,color:"var(--navy)"}}>Overs: {currInn?.o||"0.0"}</span>
        </div>
        <div style={{marginTop:12,fontSize:13,color:"var(--orange)",fontWeight:600}}>{info.status}</div>
      </div>

      {/* Batters */}
      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",boxShadow:"var(--shadow)"}}>
        <div style={{padding:"8px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)",display:"flex",fontSize:11,fontWeight:700,color:"var(--t3)"}}>
          <span style={{flex:3}}>Batter</span>
          <span style={{flex:1,textAlign:"right"}}>R</span>
          <span style={{flex:1,textAlign:"right"}}>B</span>
          <span style={{flex:1,textAlign:"right"}}>4s</span>
          <span style={{flex:1,textAlign:"right"}}>6s</span>
          <span style={{flex:1.5,textAlign:"right"}}>SR</span>
        </div>
        {(info.batsman||[]).map((b, i) => (
          <div key={i} style={{padding:"12px 14px",display:"flex",alignItems:"center",borderBottom:"1px solid var(--border)"}}>
            <div style={{flex:3,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14,fontWeight:700,color:b.strike==="1"?"var(--orange)":"var(--t1)"}}>{b.name}</span>
              {b.strike==="1" && <div style={{width:14,height:14,borderRadius:"50%",background:"rgba(249,115,22,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:6,height:6,borderRadius:"50%",background:"var(--orange)"}}/></div>}
            </div>
            <span style={{flex:1,textAlign:"right",fontSize:14,fontWeight:800}}>{b.r}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{b.b}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{b.four}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{b.six}</span>
            <span style={{flex:1.5,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{b.sr}</span>
          </div>
        ))}
        {/* Bowler */}
        <div style={{padding:"8px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)",display:"flex",fontSize:11,fontWeight:700,color:"var(--t3)",marginTop:0}}>
          <span style={{flex:3}}>Bowler</span>
          <span style={{flex:1,textAlign:"right"}}>O</span>
          <span style={{flex:1,textAlign:"right"}}>M</span>
          <span style={{flex:1,textAlign:"right"}}>R</span>
          <span style={{flex:1,textAlign:"right"}}>W</span>
          <span style={{flex:1.5,textAlign:"right"}}>ER</span>
        </div>
        {(info.bowler||[]).map((bw, i) => (
          <div key={i} style={{padding:"12px 14px",display:"flex",alignItems:"center"}}>
            <span style={{flex:3,fontSize:14,fontWeight:700,color:"var(--t1)"}}>{bw.name}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{bw.o}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{bw.m}</span>
            <span style={{flex:1,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{bw.r}</span>
            <span style={{flex:1,textAlign:"right",fontSize:14,fontWeight:800}}>{bw.w}</span>
            <span style={{flex:1.5,textAlign:"right",fontSize:13,color:"var(--t2)"}}>{bw.eco}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentaryTab({ comm }) {
  if (!comm || comm.length === 0) return <div style={{padding:20,textAlign:"center",color:"var(--t3)",fontSize:14}}>Commentary unavailable</div>;
  return (
    <div style={{padding:"14px"}}>
      {comm.map((c, i) => {
        let isW = c.event === "W";
        let is4 = c.event === "4";
        let is6 = c.event === "6";
        let bg = "var(--border2)"; let cc = "var(--t2)";
        if(isW){bg="#FEE2E2"; cc="var(--red)";} if(is4){bg="#DBEAFE"; cc="var(--blue)";} if(is6){bg="#DCFCE7"; cc="var(--green)";}
        
        return (
          <div key={i} className="fu" style={{display:"flex",gap:12,marginBottom:16,animationDelay:`${i*0.03}s`}}>
            <div style={{width:40,flexShrink:0,textAlign:"right",paddingTop:4}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--navy)"}}>{c.over}</div>
              <div style={{fontSize:9,color:"var(--t3)",fontWeight:600}}>{c.score}</div>
            </div>
            <div style={{flex:1,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px",boxShadow:"var(--shadow)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:cc}}>
                  {c.event}
                </div>
                <div style={{fontSize:14,fontWeight:800,color:"var(--t1)"}}>{c.title}</div>
              </div>
              <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5}} dangerouslySetInnerHTML={{__html: c.desc}}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MatchScreen({ match, onBack, hasApiKey, warProps }) {
  const [tab, setTab] = useState("live");
  const [info, setInfo] = useState(null);
  const [sc, setSc] = useState(null);
  const [comm, setComm] = useState(null);

  useEffect(() => {
    if (!match?.id || !hasApiKey) return;
    
    // Initial fetch
    fetchMatchInfo(match.id).then(setInfo);
    if (tab === "scorecard") fetchMatchScorecard(match.id).then(setSc);
    if (tab === "commentary") fetchMatchCommentary(match.id).then(setComm);

    // Poll current tab
    const t = setInterval(() => {
      if (tab === "live" || tab === "war") fetchMatchInfo(match.id).then(setInfo);
      if (tab === "scorecard") fetchMatchScorecard(match.id).then(setSc);
      if (tab === "commentary") fetchMatchCommentary(match.id).then(setComm);
    }, 10000);
    return () => clearInterval(t);
  }, [match.id, tab, hasApiKey]);

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)",position:"absolute",inset:0,zIndex:100}}>
      {/* Match Header */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",boxShadow:"0 1px 4px rgba(15,23,42,.06)",flexShrink:0}}>
        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
          <button className="btn" onClick={onBack} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--t2)",flexShrink:0}}>←</button>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <TeamBadge teamKey={match.t1} size={24}/>
              <span className="bc" style={{fontSize:20,color:"var(--navy)",letterSpacing:0.5}}>{match.t1}</span>
              <span style={{fontSize:10,color:"var(--t3)",fontWeight:700}}>vs</span>
              <TeamBadge teamKey={match.t2} size={24}/>
              <span className="bc" style={{fontSize:20,color:"var(--navy)",letterSpacing:0.5}}>{match.t2}</span>
            </div>
            <div style={{fontSize:11,color:"var(--t3)",fontWeight:600}}>{match.time?.split(",")[0]} • {match.venue?.split(",")[0]}</div>
          </div>
        </div>

        {/* Swipeable Custom Tabs */}
        <div style={{display:"flex",overflowX:"auto",borderTop:"1px solid var(--border)",background:"var(--card2)"}}>
          {MATCH_TABS.map(([tid, label]) => (
            <button key={tid} className="btn" onClick={() => setTab(tid)} style={{flex:1,padding:"14px 12px",background:"none",border:"none",borderBottom:`3px solid ${tab===tid?"var(--orange)":"transparent"}`,color:tab===tid?"var(--orange)":"var(--t2)",fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area */}
      <div style={{flex:1,overflowY:"auto",position:"relative"}}>
        {tab === "live" && <LiveTab match={match} info={info} />}
        {tab === "scorecard" && <FullScorecard sc={sc} />}
        {tab === "commentary" && <CommentaryTab comm={comm} />}
        {tab === "war" && <div style={{position:"absolute",inset:0}}><WarTab {...warProps} /></div>}
      </div>
    </div>
  );
}
