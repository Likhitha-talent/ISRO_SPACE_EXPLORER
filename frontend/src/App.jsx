import { useState, useEffect, useRef, useCallback } from "react";
import {
  satellitesApi, missionsApi, vehiclesApi, sitesApi, scientistsApi, checkHealth,
} from "./api";
import { useApi, useMutation } from "./hooks/useApi";

import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/AuthPage";

// ─── Fonts ────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// ─── Global styles ────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #020408; font-family: 'Inter', sans-serif; color: #dce8ff; }
  input, select, button { font-family: inherit; }
  input::placeholder { color: rgba(180,200,255,0.3); }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  ::-webkit-scrollbar-thumb { background: rgba(100,160,255,0.2); border-radius: 3px; }
  @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
`;
document.head.appendChild(style);

// ─── Star Field ───────────────────────────────────────────────────────
function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const stars = [];
    const nebulae = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 300; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: Math.random() * 1.6 + 0.2, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.004 + 0.001 });
    }
    for (let i = 0; i < 5; i++) {
      nebulae.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: 180 + Math.random() * 280, hue: [215,255,190,230,270][i], alpha: 0.025 + Math.random() * 0.035 });
    }

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#020408"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      nebulae.forEach(n => {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, `hsla(${n.hue},75%,60%,${n.alpha})`);
        g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      t += 0.01;
      stars.forEach(s => {
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.speed * 80 + s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${a})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";
const statusColor = s => {
  const l = (s || "").toLowerCase();
  if (l.includes("operational") && !l.includes("not")) return { bg: "#0a2515", border: "#1a5c30", text: "#4ade80" };
  if (l.includes("unsuccessful") || l.includes("failure")) return { bg: "#250a0a", border: "#5c1a1a", text: "#f87171" };
  return { bg: "#1a1a0a", border: "#3d3d1a", text: "#facc15" };
};

// ─── Glass Card ───────────────────────────────────────────────────────
function Card({ children, style: s = {}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && onClick ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov && onClick ? "rgba(100,160,255,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16, backdropFilter: "blur(12px)",
        transition: "all 0.22s", cursor: onClick ? "pointer" : "default",
        animation: "fadeIn 0.3s ease", ...s,
      }}>
      {children}
    </div>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ textAlign: "center", padding: 60 }}>
    <div style={{ width: 32, height: 32, border: "2px solid rgba(100,160,255,0.2)", borderTop: "2px solid #7eb8ff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
    <p style={{ marginTop: 12, color: "rgba(180,200,255,0.4)", fontSize: 13 }}>Loading…</p>
  </div>
);

const ErrorMsg = ({ msg, onRetry }) => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={{ color: "#f87171", fontSize: 14, marginBottom: 12 }}>⚠ {msg}</div>
    {onRetry && <button onClick={onRetry} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", borderRadius: 8, padding: "6px 16px", cursor: "pointer" }}>Retry</button>}
  </div>
);

// ─── Search Bar ───────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", opacity: 0.4, fontSize: 15 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Search…"}
        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(100,160,255,0.2)", borderRadius: 10, color: "#dce8ff", fontSize: 14, padding: "10px 14px 10px 38px", outline: "none" }} />
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────
function StatsRow() {
  const { data: sats }  = useApi(satellitesApi.getAll);
  const { data: miss }  = useApi(missionsApi.getAll);
  const { data: vehs }  = useApi(vehiclesApi.getAll);
  const { data: sites } = useApi(sitesApi.getAll);
  const { data: sci }   = useApi(scientistsApi.getAll);
  const opCount = sats.filter(s => { const l = (s.operational_status || "").toLowerCase(); return l.includes("operational") && !l.includes("not"); }).length;
  const stats = [
    { label: "Satellites", value: sats.length, icon: "🛰️" },
    { label: "Active", value: opCount, icon: "✅" },
    { label: "Missions", value: miss.length, icon: "🚀" },
    { label: "Vehicles", value: vehs.length, icon: "🔧" },
    { label: "Sites", value: sites.length, icon: "📍" },
    { label: "Scientists", value: sci.length, icon: "🔬" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 28 }}>
      {stats.map(s => (
        <Card key={s.label} style={{ padding: "14px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 5 }}>{s.icon}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#7eb8ff", fontFamily: "'Orbitron',monospace" }}>{s.value}</div>
          <div style={{ fontSize: 10, color: "rgba(180,200,255,0.5)", marginTop: 3, letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
        </Card>
      ))}
    </div>
  );
}

// ─── User: Satellites Tab ─────────────────────────────────────────────
function SatellitesTab() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);

  const params = {};
if (q) params.search = q;
if (filter !== "all") params.status = filter === "Operational" ? "operational" : "inactive";
  const { data, loading, error, refetch } = useApi(satellitesApi.getAll, params);

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search satellites…" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
  ["all", "All"],
  ["Operational", "Operational"],
  ["Not Operational", "Inactive"]
].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ background: filter===k?"rgba(100,160,255,0.15)":"transparent", border:`1px solid ${filter===k?"rgba(100,160,255,0.4)":"rgba(255,255,255,0.1)"}`, color:filter===k?"#7eb8ff":"rgba(180,200,255,0.45)", borderRadius:8, padding:"5px 14px", fontSize:12, cursor:"pointer" }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft:"auto", color:"rgba(180,200,255,0.4)", fontSize:12, alignSelf:"center" }}>{data.length} results</span>
      </div>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && data.map(s => {
        const sc = statusColor(s.operational_status);
        const isOpen = open === s.satellite_id;
        return (
          <Card key={s.satellite_id} onClick={() => setOpen(isOpen ? null : s.satellite_id)} style={{ padding: 16, marginBottom: 10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:"#dce8ff", marginBottom:4 }}>{s.satellite_name}</div>
                <div style={{ fontSize:12, color:"rgba(180,200,255,0.5)" }}>{s.launch_vehicle} · {fmtDate(s.launch_date)}</div>
              </div>
              <span style={{ background:sc.bg, border:`1px solid ${sc.border}`, color:sc.text, borderRadius:8, padding:"3px 10px", fontSize:11, whiteSpace:"nowrap", marginLeft:10 }}>
                {(s.operational_status||"Unknown").split("(")[0].trim()}
              </span>
            </div>
            {isOpen && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
                {[["Launch Vehicle",s.launch_vehicle],["Launch Date",fmtDate(s.launch_date)],["Status",s.operational_status],["Country",s.country]].map(([k,v])=>(
                  <div key={k}><div style={{fontSize:10,color:"rgba(180,200,255,0.4)",marginBottom:2,letterSpacing:"0.07em"}}>{k.toUpperCase()}</div><div style={{fontSize:13,color:"#c8dcff"}}>{v||"—"}</div></div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── User: Missions Tab ───────────────────────────────────────────────
function MissionsTab() {
  const [q, setQ] = useState("");
  const params = {};
  if (q) params.search = q;
  const { data, loading, error, refetch } = useApi(missionsApi.getAll, params);
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search missions…" />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"rgba(180,200,255,0.4)" }}>No missions found</div>
      )}
      {!loading && !error && data.map(m => (
        <Card key={m.mission_id} style={{ padding:16, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:"#dce8ff", marginBottom:4 }}>{m.mission_name}</div>
              <div style={{ fontSize:12, color:"rgba(180,200,255,0.5)" }}>{m.launch_vehicle}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, color:"#7eb8ff" }}>{fmtDate(m.launch_date)}</div>
              <div style={{ fontSize:11, color:"rgba(180,200,255,0.35)", marginTop:2 }}>{m.launch_site}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── User: Vehicles Tab ───────────────────────────────────────────────
function VehiclesTab() {
  const [q, setQ] = useState("");
  const params = {};
  if (q) params.search = q;
  const { data, loading, error, refetch } = useApi(vehiclesApi.getAll, params);
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search vehicles…" />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"rgba(180,200,255,0.4)" }}>No vehicles found</div>
      )}
      {!loading && !error && data.map(v => {
        const pct = Math.min(100, ((v.payload_capacity || 0) / 22800) * 100);
        return (
          <Card key={v.vehicle_id} style={{ padding:16, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:"#dce8ff" }}>{v.vehicle_name}</div>
                <div style={{ fontSize:12, color:"rgba(180,200,255,0.45)" }}>{v.vehicle_type}</div>
              </div>
              <div style={{ fontSize:13, color:"#7eb8ff", fontFamily:"'Orbitron',monospace" }}>
                {Number(v.payload_capacity || 0).toLocaleString()} kg
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:4, height:4, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#7eb8ff)", borderRadius:4 }} />
            </div>
            <div style={{ fontSize:10, color:"rgba(180,200,255,0.3)", marginTop:4 }}>PAYLOAD CAPACITY</div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── User: Sites Tab ──────────────────────────────────────────────────
function SitesTab() {
  const [q, setQ] = useState("");
  const params = {};
  if (q) params.search = q;
  const { data, loading, error, refetch } = useApi(sitesApi.getAll, params);
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search launch sites…" />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"rgba(180,200,255,0.4)" }}>No sites found</div>
      )}
      {!loading && !error && data.map(s => (
        <Card key={s.site_id} style={{ padding:16, marginBottom:10 }}>
          <div style={{ fontSize:15, fontWeight:600, color:"#dce8ff", marginBottom:8 }}>{s.site_name}</div>
          <div style={{ display:"flex", gap:24 }}>
            {[["LOCATION", s.location], ["STATE / REGION", s.state]].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize:10, color:"rgba(180,200,255,0.4)", marginBottom:2, letterSpacing:"0.07em" }}>{k}</div>
                <div style={{ fontSize:13, color:"#c8dcff" }}>{v || "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── User: Scientists Tab ─────────────────────────────────────────────
function ScientistsTab() {
  const [q, setQ] = useState("");
  const params = {};
  if (q) params.search = q;
  const { data, loading, error, refetch } = useApi(scientistsApi.getAll, params);
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search scientists…" />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"rgba(180,200,255,0.4)" }}>No scientists found</div>
      )}
      {!loading && !error && data.map(s => (
        <Card key={s.scientist_id} style={{ padding:16, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:"#dce8ff", marginBottom:4 }}>{s.scientist_name}</div>
              <div style={{ fontSize:12, color:"rgba(180,200,255,0.5)" }}>{s.specialization}</div>
            </div>
            <div style={{ background:"rgba(100,160,255,0.1)", border:"1px solid rgba(100,160,255,0.2)", borderRadius:8, padding:"6px 14px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#7eb8ff", fontFamily:"'Orbitron',monospace" }}>{s.experience_years}</div>
              <div style={{ fontSize:9, color:"rgba(180,200,255,0.4)", letterSpacing:"0.06em" }}>YRS EXP</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── User View ────────────────────────────────────────────────────────
function UserView() {
  const [tab, setTab] = useState("satellites");
  const tabs = [
    { id:"satellites", label:"Satellites", icon:"🛰️" },
    { id:"missions",   label:"Missions",   icon:"🚀" },
    { id:"vehicles",   label:"Vehicles",   icon:"🔧" },
    { id:"sites",      label:"Sites",      icon:"📍" },
    { id:"scientists", label:"Scientists", icon:"🔬" },
  ];
  return (
    <div style={{ maxWidth:880, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>🇮🇳</div>
        <h1 style={{ fontSize:34, fontWeight:900, color:"#fff", fontFamily:"'Orbitron',monospace", letterSpacing:"0.08em", textShadow:"0 0 40px rgba(100,160,255,0.45)" }}>
          INDIAN SPACE EXPLORER PORTAL
        </h1>
        <p style={{ color:"rgba(180,200,255,0.55)", fontSize:13, marginTop:8, letterSpacing:"0.1em" }}>
          INDIAN SPACE RESEARCH ORGANISATION — MISSION & SATELLITE EXPLORER
        </p>
      </div>
      <StatsRow />
      <div style={{ display:"flex", gap:8, marginBottom:22, overflowX:"auto", paddingBottom:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:tab===t.id?"rgba(100,160,255,0.2)":"rgba(255,255,255,0.03)", border:`1px solid ${tab===t.id?"rgba(100,160,255,0.5)":"rgba(255,255,255,0.08)"}`, color:tab===t.id?"#a8ccff":"rgba(180,200,255,0.5)", borderRadius:10, padding:"8px 16px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab==="satellites"  && <SatellitesTab />}
      {tab==="missions"    && <MissionsTab />}
      {tab==="vehicles"    && <VehiclesTab />}
      {tab==="sites"       && <SitesTab />}
      {tab==="scientists"  && <ScientistsTab />}
    </div>
  );
}

// ─── Admin: Generic Add Form ──────────────────────────────────────────
function AddForm({ title, fields, onSubmit, loading }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(f=>[f.key,""])));
  const [ok, setOk] = useState(false);

  const handle = async e => {
    e.preventDefault();
    try {
      await onSubmit(form);
      setOk(true);
      setTimeout(()=>setOk(false), 2000);
      setForm(Object.fromEntries(fields.map(f=>[f.key,""])));
    } catch {}
  };

  return (
    <Card style={{ padding:22, marginBottom:22 }}>
      <h3 style={{ fontSize:14, color:"#a8ccff", fontFamily:"'Orbitron',monospace", letterSpacing:"0.05em", marginBottom:18 }}>✦ {title}</h3>
      <form onSubmit={handle}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 14px", marginBottom:14 }}>
          {fields.map(f=>(
            <div key={f.key} style={f.full?{gridColumn:"1/-1"}:{}}>
              <label style={{ fontSize:10, color:"rgba(180,200,255,0.45)", letterSpacing:"0.07em", display:"block", marginBottom:3 }}>{f.label.toUpperCase()}</label>
              {f.type==="select"
                ? <select value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(100,160,255,0.2)", borderRadius:8, color:"#dce8ff", fontSize:13, padding:"8px 10px", outline:"none" }}>
                    <option value="">Select…</option>
                    {f.options?.map(o=><option key={o} value={o} style={{background:"#0a0f1a"}}>{o}</option>)}
                  </select>
                : <input type={f.type||"text"} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder||f.label}
                    style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(100,160,255,0.2)", borderRadius:8, color:"#dce8ff", fontSize:13, padding:"8px 10px", outline:"none" }} />
              }
            </div>
          ))}
        </div>
        <button type="submit" disabled={loading}
          style={{ background:ok?"rgba(74,222,128,0.15)":"rgba(100,160,255,0.15)", border:`1px solid ${ok?"rgba(74,222,128,0.4)":"rgba(100,160,255,0.4)"}`, color:ok?"#4ade80":"#7eb8ff", borderRadius:8, padding:"9px 20px", fontSize:12, cursor:"pointer", fontFamily:"'Orbitron',monospace", letterSpacing:"0.05em", opacity:loading?0.6:1 }}>
          {loading?"SAVING…": ok?"✓ SAVED":"✦ ADD RECORD"}
        </button>
      </form>
    </Card>
  );
}

// ─── Admin: Generic Data Table ────────────────────────────────────────
function DataTable({ rows, cols, onDelete, loading, error, refetch, deleteLoading }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter(r=>cols.some(c=>String(r[c.key]||"").toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Filter records…" />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} onRetry={refetch} />}
      {!loading && !error && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr>
                {cols.map(c=>(
                  <th key={c.key} style={{ textAlign:"left", padding:"8px 12px", color:"rgba(180,200,255,0.45)", fontSize:10, letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                    {c.label.toUpperCase()}
                  </th>
                ))}
                <th style={{ textAlign:"right", padding:"8px 12px", color:"rgba(180,200,255,0.45)", fontSize:10, letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>(
                <tr key={r[cols[0].idKey]||i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  {cols.map(c=>{
                    const v = r[c.key];
                    if(c.isStatus){const sc=statusColor(v);return<td key={c.key} style={{padding:"10px 12px"}}><span style={{background:sc.bg,border:`1px solid ${sc.border}`,color:sc.text,borderRadius:6,padding:"2px 8px",fontSize:11}}>{String(v||"—").split("(")[0].trim()}</span></td>;}
                    return <td key={c.key} style={{ padding:"10px 12px", color:"#c8dcff", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{String(v||"—")}</td>;
                  })}
                  <td style={{ padding:"10px 12px", textAlign:"right" }}>
                    <button onClick={()=>onDelete(r)} disabled={deleteLoading}
                      style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", borderRadius:6, padding:"3px 10px", fontSize:11, cursor:"pointer" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={cols.length+1} style={{padding:32,textAlign:"center",color:"rgba(180,200,255,0.3)"}}>No records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Admin Section Configs ────────────────────────────────────────────
const ADMIN_CONFIGS = {
  satellites: {
    label:"Satellites", icon:"🛰️",
    api: satellitesApi, idKey:"satellite_id",
    addFields:[
      {key:"satellite_name", label:"Satellite Name", full:true},
      {key:"launch_date", label:"Launch Date", type:"date"},
      {key:"launch_vehicle", label:"Launch Vehicle"},
      {key:"operational_status", label:"Status", type:"select", options:["Operational","Not Operational","Launch unsuccessful","Satellite failure"]},
      {key:"country", label:"Country", placeholder:"India"},
    ],
    cols:[{key:"satellite_name",label:"Name"},{key:"launch_date",label:"Date"},{key:"launch_vehicle",label:"Vehicle"},{key:"operational_status",label:"Status",isStatus:true}],
  },
  missions: {
    label:"Missions", icon:"🚀",
    api: missionsApi, idKey:"mission_id",
    addFields:[
      {key:"mission_name", label:"Mission Name", full:true},
      {key:"launch_date", label:"Launch Date", type:"date"},
      {key:"launch_vehicle", label:"Launch Vehicle"},
      {key:"launch_site", label:"Launch Site"},
    ],
    cols:[{key:"mission_name",label:"Mission"},{key:"launch_date",label:"Date"},{key:"launch_vehicle",label:"Vehicle"},{key:"launch_site",label:"Site"}],
  },
  vehicles: {
    label:"Vehicles", icon:"🔧",
    api: vehiclesApi, idKey:"vehicle_id",
    addFields:[
      {key:"vehicle_name", label:"Vehicle Name"},
      {key:"vehicle_type", label:"Vehicle Type", full:true},
      {key:"payload_capacity", label:"Payload Capacity (kg)", type:"number"},
    ],
    cols:[{key:"vehicle_name",label:"Name"},{key:"vehicle_type",label:"Type"},{key:"payload_capacity",label:"Payload (kg)"}],
  },
  sites: {
    label:"Sites", icon:"📍",
    api: sitesApi, idKey:"site_id",
    addFields:[
      {key:"site_name", label:"Site Name", full:true},
      {key:"location", label:"City / Location"},
      {key:"state", label:"State / Region"},
    ],
    cols:[{key:"site_name",label:"Site Name"},{key:"location",label:"Location"},{key:"state",label:"State"}],
  },
  scientists: {
    label:"Scientists", icon:"🔬",
    api: scientistsApi, idKey:"scientist_id",
    addFields:[
      {key:"scientist_name", label:"Scientist Name", full:true},
      {key:"specialization", label:"Specialization"},
      {key:"experience_years", label:"Experience (years)", type:"number"},
    ],
    cols:[{key:"scientist_name",label:"Name"},{key:"specialization",label:"Specialization"},{key:"experience_years",label:"Exp. (yrs)"}],
  },
};

// ─── Admin Section ────────────────────────────────────────────────────
function AdminSection({ sectionKey }) {
  const cfg = ADMIN_CONFIGS[sectionKey];
  const { data, loading, error, refetch } = useApi(cfg.api.getAll);

  const { mutate: createFn, loading: createLoading } = useMutation(cfg.api.create, refetch);
  const { mutate: deleteFn, loading: deleteLoading } = useMutation(cfg.api.remove, refetch);

  const handleDelete = useCallback(row => {
    if (window.confirm(`Delete "${row[cfg.addFields[0].key]}"?`)) {
      deleteFn(row[cfg.idKey]);
    }
  }, [cfg, deleteFn]);

  return (
    <div>
      <AddForm title={`Add New ${cfg.label.slice(0,-1)}`} fields={cfg.addFields} onSubmit={createFn} loading={createLoading} />
      <Card style={{ padding:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <span style={{ fontSize:20 }}>{cfg.icon}</span>
          <h2 style={{ fontSize:16, fontWeight:700, color:"#a8ccff", fontFamily:"'Orbitron',monospace", letterSpacing:"0.05em" }}>All {cfg.label}</h2>
          <span style={{ marginLeft:"auto", background:"rgba(100,160,255,0.1)", border:"1px solid rgba(100,160,255,0.2)", color:"#7eb8ff", borderRadius:16, padding:"2px 12px", fontSize:12 }}>{data.length}</span>
        </div>
        <DataTable rows={data} cols={cfg.cols} onDelete={handleDelete} loading={loading} error={error} refetch={refetch} deleteLoading={deleteLoading} />
      </Card>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────
function AdminView() {
  const [section, setSection] = useState("satellites");
  const sections = Object.entries(ADMIN_CONFIGS).map(([id,c])=>({id, label:c.label, icon:c.icon}));
  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <span style={{ fontSize:26 }}>⚙️</span>
          <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", fontFamily:"'Orbitron',monospace", letterSpacing:"0.08em" }}>ADMIN PANEL</h1>
          <span style={{ background:"rgba(250,204,21,0.12)", border:"1px solid rgba(250,204,21,0.3)", color:"#facc15", borderRadius:8, padding:"3px 10px", fontSize:11, letterSpacing:"0.06em" }}>MANAGER ACCESS</span>
        </div>
        <p style={{ fontSize:13, color:"rgba(180,200,255,0.4)", letterSpacing:"0.05em" }}>Manage ISRO database records — add, view, delete</p>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:26, overflowX:"auto", paddingBottom:4 }}>
        {sections.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)}
            style={{ background:section===s.id?"rgba(250,204,21,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${section===s.id?"rgba(250,204,21,0.4)":"rgba(255,255,255,0.08)"}`, color:section===s.id?"#facc15":"rgba(180,200,255,0.5)", borderRadius:10, padding:"8px 16px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      <AdminSection key={section} sectionKey={section} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("user");
  const [dbStatus, setDbStatus] = useState("checking");
  const { user, isAdmin, isLogged, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    checkHealth()
      .then(() => setDbStatus("connected"))
      .catch(() => setDbStatus("error"));
  }, []);

  // Show nothing while restoring session from localStorage
  if (authLoading) return null;

  // Not logged in → show auth page
  if (!isLogged) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <AuthPage onSuccess={() => {}} />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <StarField />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(2,4,8,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(100,160,255,0.1)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 14, color: "#a8ccff", letterSpacing: "0.08em" }}>ISRO PORTAL</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid", ...(dbStatus === "connected" ? { background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.3)", color: "#4ade80" } : dbStatus === "error" ? { background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.3)", color: "#f87171" } : { background: "rgba(250,204,21,0.1)", borderColor: "rgba(250,204,21,0.3)", color: "#facc15" }) }}>
            {dbStatus === "connected" ? "● DB LIVE" : dbStatus === "error" ? "● DB ERROR" : "● CONNECTING"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* User badge */}
          <div style={{ background: isAdmin ? "rgba(250,204,21,0.08)" : "rgba(100,160,255,0.08)", border: `1px solid ${isAdmin ? "rgba(250,204,21,0.2)" : "rgba(100,160,255,0.2)"}`, borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
            <span style={{ color: isAdmin ? "#facc15" : "#7eb8ff" }}>
              {isAdmin ? "⚙️ " : "🌍 "}
            </span>
            <span style={{ color: "rgba(180,200,255,0.7)" }}>{user.full_name}</span>
            {isAdmin && <span style={{ marginLeft: 6, background: "rgba(250,204,21,0.15)", color: "#facc15", borderRadius: 4, padding: "1px 6px", fontSize: 10, letterSpacing: "0.06em" }}>ADMIN</span>}
          </div>

          {/* View toggle — only show Admin tab if admin */}
          {[["user", "🌍 Explorer"], ...(isAdmin ? [["admin", "⚙️ Admin"]] : [])].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ background: view === v ? (v === "admin" ? "rgba(250,204,21,0.15)" : "rgba(100,160,255,0.15)") : "transparent", border: `1px solid ${view === v ? (v === "admin" ? "rgba(250,204,21,0.4)" : "rgba(100,160,255,0.4)") : "rgba(255,255,255,0.1)"}`, color: view === v ? (v === "admin" ? "#facc15" : "#7eb8ff") : "rgba(180,200,255,0.5)", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
              {l}
            </button>
          ))}

          {/* Logout */}
          <button onClick={logout}
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Redirect non-admins away from admin panel */}
        {view === "user" ? <UserView /> : isAdmin ? <AdminView /> : <UserView />}
      </div>

      <footer style={{ textAlign: "center", padding: "20px 16px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 40 }}>
        <p style={{ fontSize: 11, color: "rgba(180,200,255,0.25)", letterSpacing: "0.1em" }}>
          ISRO SPACE PORTAL · DATA EXPLORER & MANAGEMENT SYSTEM · INDIA
        </p>
      </footer>
    </div>
  );
}
