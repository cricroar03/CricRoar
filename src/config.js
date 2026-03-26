export const CFG = {
  SUPABASE_URL:  import.meta.env.VITE_SUPABASE_URL  || "",
  SUPABASE_KEY:  import.meta.env.VITE_SUPABASE_KEY  || "",
  CRICKET_API:   import.meta.env.VITE_CRICKET_API   || "",
  RAZORPAY_KEY:  import.meta.env.VITE_RAZORPAY_KEY  || "",
  GEMINI_KEY:    import.meta.env.VITE_GEMINI_KEY    || "",
  PLAN_AMOUNT:   4900,
};

export const TEAMS = {
  RCB:  { n:"Royal Challengers Bengaluru", s:"RCB",  c:"#CB1727", a:"#FFD700", g:"135deg,#CB1727,#860D18" },
  MI:   { n:"Mumbai Indians",              s:"MI",   c:"#004BA0", a:"#29B6F6", g:"135deg,#004BA0,#00286A" },
  CSK:  { n:"Chennai Super Kings",         s:"CSK",  c:"#E8A900", a:"#2563EB", g:"135deg,#E8A900,#C17B00" },
  KKR:  { n:"Kolkata Knight Riders",       s:"KKR",  c:"#3D1A78", a:"#FFD700", g:"135deg,#3D1A78,#200D45" },
  SRH:  { n:"Sunrisers Hyderabad",         s:"SRH",  c:"#F15A22", a:"#FFCD00", g:"135deg,#F15A22,#A83200" },
  DC:   { n:"Delhi Capitals",              s:"DC",   c:"#0057A8", a:"#EF1C25", g:"135deg,#0057A8,#003670" },
  PBKS: { n:"Punjab Kings",               s:"PBKS", c:"#CF0A0A", a:"#FFD700", g:"135deg,#CF0A0A,#7F0000" },
  GT:   { n:"Gujarat Titans",             s:"GT",   c:"#1B4F8A", a:"#D4A843", g:"135deg,#1B4F8A,#0A2244" },
  LSG:  { n:"Lucknow Super Giants",       s:"LSG",  c:"#A72B6E", a:"#F9D342", g:"135deg,#A72B6E,#5C0D3A" },
  RR:   { n:"Rajasthan Royals",           s:"RR",   c:"#2B4DC9", a:"#F472B6", g:"135deg,#2B4DC9,#0E2180" },
};

export const resolveTeam = (name) => {
  if (!name) return null;
  const u = name.toUpperCase();
  return Object.keys(TEAMS).find(k =>
    u.includes(k) || TEAMS[k].n.toUpperCase().split(" ").some(w => w.length > 3 && u.includes(w))
  ) || null;
};

export const FREE_LIMIT   = 3;
export const uid          = () => `u_${Math.random().toString(36).slice(2,10)}`;
export const today        = () => new Date().toISOString().slice(0,10);
export const timeAgo      = (ts) => {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h`;
};
