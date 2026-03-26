export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap');
:root {
  --bg:      #F1F3F8;
  --surface: #FFFFFF;
  --card:    #FFFFFF;
  --card2:   #F7F8FC;
  --card3:   #EDF0F7;
  --border:  #E4E8F0;
  --border2: #D0D6E6;
  --t1:      #0F172A;
  --t2:      #475569;
  --t3:      #94A3B8;
  --navy:    #1A2B6D;
  --orange:  #FF6B00;
  --red:     #DC2626;
  --green:   #16A34A;
  --gold:    #D97706;
  --r:       14px;
  --r-sm:    8px;
  --r-lg:    20px;
  --shadow:  0 1px 4px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.07);
  --shadow2: 0 2px 8px rgba(15,23,42,.08), 0 8px 28px rgba(15,23,42,.1);
}
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; background:var(--bg); overscroll-behavior:none; }
body { color:var(--t1); font-family:'Inter',sans-serif; font-size:14px; line-height:1.5; }
::-webkit-scrollbar { width:0; }
input, textarea { font-family:'Inter',sans-serif; }
input:focus, textarea:focus { outline:none; }
input::placeholder, textarea::placeholder { color:var(--t3); }
.bc { font-family:'Barlow Condensed',sans-serif; letter-spacing:.5px; }
.btn { cursor:pointer; border:none; outline:none; -webkit-user-select:none; user-select:none; transition:transform .12s ease, opacity .12s ease, box-shadow .15s ease; }
.btn:active { transform:scale(.95); opacity:.85; }

@keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes scaleIn  { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
@keyframes slideUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
@keyframes livePing { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.4);opacity:0} 100%{opacity:0} }
@keyframes shimmer  { from{background-position:-200% 0} to{background-position:200% 0} }
@keyframes popIn    { 0%{transform:scale(.8);opacity:0} 80%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }

.fu { animation:fadeUp .28s ease both; }
.fi { animation:fadeIn .22s ease both; }
.si { animation:scaleIn .28s cubic-bezier(.4,0,.2,1) both; }
.su { animation:slideUp .32s cubic-bezier(.4,0,.2,1) both; }
.shake { animation:shake .32s ease; }
.spin  { animation:spin .8s linear infinite; display:inline-block; }
.pop   { animation:popIn .3s cubic-bezier(.34,1.56,.64,1) both; }
`;
