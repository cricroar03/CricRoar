import { useState } from "react";
import logoSrc from "/logo.png";
import { GLOBAL_CSS } from "./styles.js";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const WHY = [
  ["Live Scores", "Real-time IPL 2026 match updates"],
  ["Fan War Room", "Roast rival fans during live matches"],
  ["Win Predictor", "Community win % — vote with your team"],
  ["AI Roast Bot",  "AI fires savage roasts for you (Pro)"],
];

export default function Login({ onGoogle, onGuest, isDemo, error }) {
  const [step, setStep] = useState("main");
  const [name, setName] = useState("");

  // Guest name entry
  if (step === "name") return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:10}}>
        <button className="btn" onClick={() => setStep("main")} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,width:36,height:36,fontSize:16,color:"var(--t2)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--shadow)"}}>←</button>
        <span style={{fontSize:13,color:"var(--t3)",fontWeight:600}}>Guest Mode</span>
      </div>
      <div className="fu" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px 80px"}}>
        <div style={{fontSize:11,color:"var(--orange)",fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Choose Your Battle Name</div>
        <div style={{fontSize:28,fontWeight:900,color:"var(--t1)",marginBottom:4,lineHeight:1.2}}>What should fans call you?</div>
        <div style={{fontSize:13,color:"var(--t3)",marginBottom:32,fontWeight:500}}>Shows next to your roasts in the War Room</div>

        <input value={name} onChange={e=>setName(e.target.value.replace(/\s/g,""))}
          onKeyDown={e=>e.key==="Enter"&&name.trim()&&onGuest(name.trim())}
          placeholder="e.g. RCBMacha99" maxLength={18} autoFocus
          style={{width:"100%",background:"var(--card)",border:"2px solid var(--border2)",borderRadius:14,padding:"18px 20px",color:"var(--t1)",fontSize:22,fontWeight:800,textAlign:"center",marginBottom:8,letterSpacing:.5,boxShadow:"var(--shadow)",transition:"border .2s"}}
          onFocus={e=>e.target.style.borderColor="var(--navy)"}
          onBlur={e=>e.target.style.borderColor="var(--border2)"}
        />
        <div style={{fontSize:11,color:"var(--t3)",textAlign:"center",marginBottom:24,fontWeight:500}}>{name.length}/18</div>
        <button className="btn" onClick={()=>name.trim()&&onGuest(name.trim())} disabled={!name.trim()}
          style={{width:"100%",borderRadius:14,padding:"17px",fontSize:16,fontWeight:800,color:"#fff",background:name.trim()?"linear-gradient(135deg,var(--navy),#2D46B5)":"var(--card3)",boxShadow:name.trim()?"0 6px 24px rgba(26,43,109,.3)":"none",cursor:name.trim()?"pointer":"default"}}>
          Enter War Room →
        </button>
      </div>
    </div>
  );

  // Main login screen  
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{position:"absolute",top:0,left:0,right:0,height:320,background:"linear-gradient(180deg,rgba(26,43,109,.06) 0%,transparent 100%)",pointerEvents:"none"}}/>

      <div style={{flex:1,padding:"0 20px",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingBottom:24}}>
        {/* Logo area */}
        <div className="pop" style={{textAlign:"center",marginBottom:28}}>
          <img src={logoSrc} alt="CricRoar" style={{width:110,height:110,objectFit:"contain",marginBottom:4,filter:"drop-shadow(0 6px 18px rgba(26,43,109,.2))"}}
            onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
          <div style={{display:"none"}}>
            <div style={{width:80,height:80,borderRadius:20,background:"linear-gradient(135deg,#1A2B6D,#FF6B00)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",boxShadow:"0 6px 24px rgba(26,43,109,.3)"}}>
              <span className="bc" style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:1}}>CR</span>
            </div>
          </div>
          <div style={{fontSize:11,color:"var(--t3)",letterSpacing:4,textTransform:"uppercase",fontWeight:700}}>IPL 2026 · Fan War Room</div>
        </div>

        {/* Feature list */}
        <div className="fu" style={{width:"100%",maxWidth:380,background:"var(--card)",borderRadius:18,overflow:"hidden",boxShadow:"var(--shadow2)",marginBottom:20,border:"1px solid var(--border)",animationDelay:".06s"}}>
          {WHY.map(([title, sub], i) => (
            <div key={title} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<WHY.length-1?"1px solid var(--border)":"none"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:i%2===0?"var(--navy)":"var(--orange)",flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{title}</div>
                <div style={{fontSize:11,color:"var(--t3)",fontWeight:500}}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="fu" style={{width:"100%",maxWidth:380,animationDelay:".1s"}}>
          <div style={{fontSize:20,fontWeight:900,color:"var(--t1)",marginBottom:4,textAlign:"center"}}>Join the <span style={{color:"var(--navy)"}}>War Room</span></div>
          <div style={{fontSize:12,color:"var(--t3)",textAlign:"center",marginBottom:20,fontWeight:500}}>Roast. Battle. Win the internet. 🔥</div>

          {error && (
            <div className="shake" style={{background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",borderRadius:11,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--red)",lineHeight:1.5,fontWeight:600}}>{error}</div>
          )}

          <button className="btn" onClick={onGoogle} style={{width:"100%",background:"#fff",border:"1.5px solid var(--border2)",borderRadius:14,padding:"15px 20px",color:"var(--t1)",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:10,boxShadow:"var(--shadow2)"}}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{flex:1,height:1,background:"var(--border)"}}/><span style={{fontSize:11,color:"var(--t3)",fontWeight:600}}>or</span><div style={{flex:1,height:1,background:"var(--border)"}}/>
          </div>

          <button className="btn" onClick={()=>setStep("name")} style={{width:"100%",background:"var(--card2)",border:"1.5px solid var(--border)",borderRadius:14,padding:"15px 20px",color:"var(--t2)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"var(--shadow)"}}>
            Continue as Guest
          </button>

          <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",marginTop:16,lineHeight:1.9,fontWeight:500}}>
            Not affiliated with BCCI or IPL · Fan platform only<br/>By signing in you agree to keep banter clean
          </div>
        </div>
      </div>
    </div>
  );
}
