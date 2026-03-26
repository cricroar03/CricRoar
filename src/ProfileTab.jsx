export default function ProfileTab({ user, isPro, setShowPro, onLogout }) {
  return (
    <div style={{padding:"16px 16px 80px"}}>
      {/* Avatar hero */}
      <div className="fu" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:"26px 22px",marginBottom:12,textAlign:"center",position:"relative",overflow:"hidden",boxShadow:"var(--shadow2)"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:130,height:130,borderRadius:"50%",background:isPro?"rgba(217,119,6,.06)":"rgba(26,43,109,.04)",pointerEvents:"none"}}/>
        <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 14px",background:isPro?"linear-gradient(135deg,#D97706,#F59E0B)":"linear-gradient(135deg,#1A2B6D,#2D46B5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,overflow:"hidden",boxShadow:isPro?"0 6px 24px rgba(217,119,6,.3)":"0 6px 24px rgba(26,43,109,.25)"}}>
          {user?.avatar?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:(user?.name?.[0]||"F").toUpperCase()}
        </div>
        <div className="bc" style={{fontSize:24,marginBottom:6,color:"var(--t1)",letterSpacing:.5}}>{user?.name}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:isPro?"rgba(217,119,6,.08)":"rgba(26,43,109,.06)",border:`1px solid ${isPro?"rgba(217,119,6,.2)":"rgba(26,43,109,.12)"}`,borderRadius:20,padding:"5px 14px",fontSize:11,color:isPro?"var(--gold)":"var(--navy)",fontWeight:800}}>
          {isPro?"PRO MEMBER":"FREE PLAN"}
        </div>
      </div>

      {/* Plan card */}
      {!isPro ? (
        <div className="fu" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"18px",marginBottom:12,animationDelay:".06s",boxShadow:"var(--shadow)"}}>
          <div className="bc" style={{fontSize:14,marginBottom:14,color:"var(--t1)",letterSpacing:.5}}>Your Free Plan</div>
          {[["✓","Live scores — all matches","var(--green)"],["✓","War room — read messages","var(--green)"],["✓","3 roasts per match day","var(--green)"],["✗","Win predictions — locked","var(--t3)"],["✗","AI Roast button — locked","var(--t3)"],["✗","Ad-free experience — locked","var(--t3)"]].map(([ic,ft,col])=>(
            <div key={ft} style={{display:"flex",gap:10,marginBottom:9,alignItems:"center"}}>
              <span style={{fontSize:11,width:16,textAlign:"center",color:col,fontWeight:800}}>{ic}</span>
              <span style={{fontSize:12,fontWeight:600,color:col==="var(--t3)"?"var(--t3)":"var(--t2)"}}>{ft}</span>
            </div>
          ))}
          <button className="btn" onClick={()=>setShowPro(true)} style={{width:"100%",marginTop:14,background:"linear-gradient(135deg,var(--orange),#FF8C2A)",borderRadius:12,padding:"14px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:.3,boxShadow:"0 4px 18px rgba(255,107,0,.3)"}}>
            Upgrade to Pro — ₹49/month
          </button>
        </div>
      ) : (
        <div className="fu" style={{background:"rgba(217,119,6,.04)",border:"1px solid rgba(217,119,6,.14)",borderRadius:16,padding:"18px",marginBottom:12,animationDelay:".06s",boxShadow:"var(--shadow)"}}>
          <div className="bc" style={{fontSize:14,marginBottom:14,color:"var(--gold)",letterSpacing:.5}}>Pro Benefits Active</div>
          {[["✓","Unlimited roasts every day"],["✓","Vote on win predictions"],["✓","AI Roast — 10 per match"],["✓","Man of the Roast badge"],["✓","Zero ads forever"]].map(([ic,ft])=>(
            <div key={ft} style={{display:"flex",gap:10,marginBottom:9,alignItems:"center"}}>
              <span style={{fontSize:11,width:16,textAlign:"center",color:"var(--green)",fontWeight:800}}>{ic}</span>
              <span style={{fontSize:12,fontWeight:600,color:"var(--t2)"}}>{ft}</span>
            </div>
          ))}
        </div>
      )}

      <div className="fu" style={{animationDelay:".1s"}}>
        <button className="btn" onClick={onLogout} style={{width:"100%",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px",color:"var(--t2)",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:14,boxShadow:"var(--shadow)"}}>
          Sign Out
        </button>
        <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",lineHeight:1.9,fontWeight:500}}>
          CricRoar is not affiliated with BCCI or IPL · Fan platform only<br/>Made with love for cricket fans · IPL 2026
        </div>
      </div>
    </div>
  );
}
