export default function ProModal({ onBuy, onClose }) {
  const perks = [
    ["Unlimited Roasts",       "Free: 3 per match day"],
    ["AI Roast Bot",           "Free: locked"],
    ["Vote on Win Prediction", "Free: view only"],
    ["Man of the Roast Badge", "Free: locked"],
    ["Zero Ads Forever",       "Free: ads shown"],
  ];
  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",backdropFilter:"blur(14px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="su" style={{background:"var(--card)",borderRadius:"24px 24px 0 0",padding:"0 22px 44px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",position:"relative",boxShadow:"0 -8px 48px rgba(15,23,42,.14)"}}>
        {/* Handle */}
        <div style={{width:36,height:4,borderRadius:2,background:"var(--card3)",margin:"16px auto 0"}}/>
        <button className="btn" onClick={onClose} style={{position:"absolute",top:12,right:16,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:"50%",width:32,height:32,color:"var(--t2)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>

        {/* Header */}
        <div style={{textAlign:"center",padding:"24px 0 20px"}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,var(--orange),#FF8C2A)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 6px 20px rgba(255,107,0,.3)"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div className="bc" style={{fontSize:34,color:"var(--t1)",marginBottom:4,letterSpacing:.5}}>GO PRO</div>
          <div style={{fontSize:13,color:"var(--t3)",fontWeight:500}}>Unlock the full CricRoar experience</div>
        </div>

        {/* Perks */}
        <div style={{background:"var(--card2)",borderRadius:16,padding:"4px 16px",marginBottom:20,border:"1px solid var(--border)"}}>
          {perks.map(([title, sub], i) => (
            <div key={title} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 0",borderBottom:i<perks.length-1?"1px solid var(--border)":"none"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="10" height="10" viewBox="0 0 12 12"><path d="M1 6l4 4 6-8" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{title}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontWeight:500}}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{background:"linear-gradient(135deg,rgba(26,43,109,.04),rgba(255,107,0,.04))",border:"1px solid var(--border)",borderRadius:16,padding:"16px",marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--t3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Monthly Plan</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:3,marginBottom:3}}>
            <span className="bc" style={{fontSize:44,color:"var(--t1)",lineHeight:1,fontWeight:700}}>₹49</span>
            <span style={{fontSize:12,color:"var(--t3)",fontWeight:600}}>/month</span>
          </div>
          <div style={{fontSize:10,color:"var(--t3)",fontWeight:500}}>Cancel anytime · Auto-renews monthly</div>
        </div>

        <button className="btn" onClick={onBuy} style={{width:"100%",background:"linear-gradient(135deg,var(--orange),#FF8C2A)",borderRadius:14,padding:"17px",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:700,cursor:"pointer",letterSpacing:1.5,boxShadow:"0 8px 32px rgba(255,107,0,.35)"}}>
          UNLOCK NOW — ₹49/MONTH
        </button>
        <div style={{fontSize:9,color:"var(--t3)",textAlign:"center",marginTop:10,fontWeight:500}}>Secure payment via Razorpay · IPL 2026 season</div>
      </div>
    </div>
  );
}
