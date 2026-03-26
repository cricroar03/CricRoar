import { CFG, TEAMS, resolveTeam } from "./config.js";

// ── SUPABASE ────────────────────────────────────────────────
export function makeSB(url, key) {
  const h = { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" };
  const q = (path, opts={}) => fetch(`${url}/rest/v1/${path}`, { headers:h, ...opts }).then(r=>r.ok?r.json():[]).catch(()=>[]);
  return {
    getUser:    (id)  => q(`users?id=eq.${id}`).then(r=>r[0]||null),
    upsertUser: (u)   => q(`users`, { method:"POST", headers:{...h,Prefer:"resolution=merge-duplicates,return=representation"}, body:JSON.stringify(u) }),
    getRoasts:  (mid) => q(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=150`),
    postRoast:  (m)   => q(`roasts`, { method:"POST", body:JSON.stringify(m) }),
    patchVotes: (id,v)=> q(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({votes:v}) }),
    patchReport:(id,r,h2)=> q(`roasts?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({reports:r,hidden:h2}) }),
    getPreds:   (mid) => q(`predictions?match_id=eq.${mid}`),
    postPred:   (p)   => q(`predictions`, { method:"POST", headers:{...h,Prefer:"resolution=ignore-duplicates"}, body:JSON.stringify(p) }),
    poll: (mid,cb) => {
      const t = setInterval(() => q(`roasts?match_id=eq.${mid}&hidden=eq.false&order=created_at.asc&limit=150`).then(cb), 4000);
      return () => clearInterval(t);
    },
    signInGoogle: async () => {
      window.location.href = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('https://cric-roar.vercel.app')}`;
    },
    getSession: async () => {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const p = new URLSearchParams(hash.slice(1));
        const token = p.get("access_token");
        if (token) {
          const r = await fetch(`${url}/auth/v1/user`, { headers:{ apikey:key, Authorization:`Bearer ${token}` } });
          const user = await r.json();
          localStorage.setItem("cr_token", token);
          return { token, user };
        }
      }
      const stored = localStorage.getItem("cr_token");
      if (stored) {
        try {
          const r = await fetch(`${url}/auth/v1/user`, { headers:{ apikey:key, Authorization:`Bearer ${stored}` } });
          if (r.ok) { const user = await r.json(); return { token:stored, user }; }
        } catch {}
      }
      return null;
    },
  };
}

// ── GEMINI HELPER ────────────────────────────────────────────
async function callGemini(prompt, maxTokens=60) {
  if (!CFG.GEMINI_KEY) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CFG.GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
        }),
      }
    );
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

// ── AI MODERATION ─────────────────────────────────────────────
export async function moderate(text) {
  if (!CFG.GEMINI_KEY) return "SAFE"; // if no key, allow all (Supabase RLS still protects)
  const result = await callGemini(
    `You are a cricket fan chat moderator. Reply with only one word: SAFE or BLOCK.\nBLOCK if the message contains: hate speech, casteism, slurs, threats, sexual content, or personal attacks on real individuals.\nSAFE if it is: team rivalry banter, cricket jokes, player performance roasts, trash talk about teams.\nMessage to check: "${text}"`,
    5
  );
  return result?.toUpperCase().startsWith("B") ? "BLOCK" : "SAFE";
}

// ── AI ROAST GENERATOR ────────────────────────────────────────
export async function genRoast(teamKey) {
  const teamName = TEAMS[teamKey]?.n || teamKey;
  const result = await callGemini(
    `Write ONE savage, funny cricket roast targeting ${teamName} fans. Max 14 words. No slurs. Hindi/English mix is fine. Just the roast text, nothing else.`,
    80
  );
  return result;
}

// ── LIVE CRICKET SCORES ──────────────────────────────────────
export async function fetchScores() {
  if (!CFG.CRICKET_API) return null;
  try {
    let url = `https://api.cricapi.com/v1/currentMatches?apikey=${CFG.CRICKET_API}&offset=0`;
    let r = await fetch(url);
    let d = await r.json();
    
    // Fallback if no matches returned or empty data
    if (d.status !== "success" || !d.data || d.data.length === 0) {
      url = `https://api.cricapi.com/v1/matches?apikey=${CFG.CRICKET_API}&offset=0`;
      r = await fetch(url);
      d = await r.json();
    }
    if (d.status !== "success" || !d.data) return [];
    
    // Prioritize LIVE, then UPCOMING, then COMPLETED
    const sorted = d.data.sort((a, b) => {
      const isALive = a.matchStarted && !a.matchEnded;
      const isBLive = b.matchStarted && !b.matchEnded;
      if (isALive !== isBLive) return isALive ? -1 : 1;
      return 0; // retain original API order for rest
    });

    return sorted.slice(0, 15).map(m => ({
        id: m.id,
        t1: resolveTeam(m.teams?.[0]) || m.teamInfo?.[0]?.shortname || m.teams?.[0] || "TBA",
        t2: resolveTeam(m.teams?.[1]) || m.teamInfo?.[1]?.shortname || m.teams?.[1] || "TBA",
        t1img: m.teamInfo?.[0]?.img || "",
        t2img: m.teamInfo?.[1]?.img || "",
        status: m.matchStarted&&!m.matchEnded?"LIVE":m.matchEnded?"ENDED":"UPCOMING",
        state: m.status || "",
        time: m.date||"",
        venue: m.venue||"",
        s1: m.score?.[0]?`${m.score[0].r}/${m.score[0].w}`:null, ov1:m.score?.[0]?.o||null,
        s2: m.score?.[1]?`${m.score[1].r}/${m.score[1].w}`:null, ov2:m.score?.[1]?.o||null,
        target: m.score?.[0]?String(Number(m.score[0].r)+1):null,
      }));
  } catch { return []; } // Return empty array to identify loading vs loaded-but-empty
}

export async function fetchMatchInfo(id) {
  if (!CFG.CRICKET_API) return null;
  try {
    const r = await fetch(`https://api.cricapi.com/v1/match/info?apikey=${CFG.CRICKET_API}&id=${id}`);
    const d = await r.json();
    return d.status === "success" ? d.data : null;
  } catch { return null; }
}

export async function fetchMatchScorecard(id) {
  if (!CFG.CRICKET_API) return null;
  try {
    const r = await fetch(`https://api.cricapi.com/v1/match/scorecard?apikey=${CFG.CRICKET_API}&id=${id}`);
    const d = await r.json();
    return d.status === "success" ? d.data : null;
  } catch { return null; }
}

export async function fetchMatchCommentary(id) {
  if (!CFG.CRICKET_API) return null;
  try {
    const r = await fetch(`https://api.cricapi.com/v1/match/cbbinfo?apikey=${CFG.CRICKET_API}&id=${id}`);
    const d = await r.json();
    return d.status === "success" ? d.data : null;
  } catch { return null; }
}

// ── RAZORPAY ─────────────────────────────────────────────────
export function payRazorpay(userId, userName, email, onSuccess) {
  if (!CFG.RAZORPAY_KEY) { onSuccess({ demo:true }); return; }
  if (!window.Razorpay) { alert("Payment loading... please try again."); return; }
  new window.Razorpay({
    key:CFG.RAZORPAY_KEY, amount:CFG.PLAN_AMOUNT, currency:"INR",
    name:"CricRoar", description:"Pro Plan — 1 Month",
    handler: onSuccess,
    prefill:{ name:userName, email:email||"" },
    theme:{ color:"#1A2B6D" },
  }).open();
}
