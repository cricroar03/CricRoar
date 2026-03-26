import { GLOBAL_CSS } from "./styles.js";

export default function Splash() {
  return (
    <div style={{height:"100vh",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <style>{GLOBAL_CSS}</style>
      {/* Soft background */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% -10%,rgba(26,43,109,.07) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div className="pop" style={{textAlign:"center",position:"relative",zIndex:1}}>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="CricRoar"
          style={{width:130,height:130,objectFit:"contain",marginBottom:18,filter:"drop-shadow(0 8px 20px rgba(26,43,109,.18))"}}
          onError={e => {
            // Fallback SVG badge if logo not yet placed
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
        {/* Fallback badge shown if no logo.png */}
        <div style={{display:"none",width:100,height:100,borderRadius:24,background:"linear-gradient(135deg,#1A2B6D,#2D46B5)",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:"0 8px 32px rgba(26,43,109,.28)"}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:"#FF6B00",letterSpacing:1}}>CR</span>
        </div>
        <div className="bc" style={{fontSize:14,color:"var(--t3)",letterSpacing:5,textTransform:"uppercase",fontWeight:700}}>Fan War Room · IPL 2026</div>
        {/* Loader dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:28}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--navy)",animation:`spin .9s ${i*.15}s ease-in-out infinite`,opacity:.4}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
