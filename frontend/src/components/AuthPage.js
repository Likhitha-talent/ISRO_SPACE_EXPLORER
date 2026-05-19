import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

// ─── Mini star field just for auth pages ─────────────────────────────
function Stars() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.003 + 0.001,
    }));
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#020408"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // subtle nebula
      const g = ctx.createRadialGradient(canvas.width*0.3, canvas.height*0.4, 0, canvas.width*0.3, canvas.height*0.4, 350);
      g.addColorStop(0, "hsla(220,70%,50%,0.04)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const g2 = ctx.createRadialGradient(canvas.width*0.75, canvas.height*0.6, 0, canvas.width*0.75, canvas.height*0.6, 280);
      g2.addColorStop(0, "hsla(260,70%,60%,0.04)"); g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height);
      t += 0.01;
      stars.forEach(s => {
        const a = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.speed * 80 + s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${a})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}

// ─── Input field component ────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, icon, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(180,200,255,0.5)", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.45 }}>{icon}</span>
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "rgba(100,160,255,0.2)"}`,
            borderRadius: 10, color: "#dce8ff", fontSize: 14,
            padding: isPassword ? "11px 40px 11px 38px" : "11px 14px 11px 38px",
            outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(100,160,255,0.5)"}
          onBlur={e => e.target.style.borderColor = error ? "rgba(248,113,113,0.5)" : "rgba(100,160,255,0.2)"}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(180,200,255,0.4)", fontSize: 14 }}>
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─── Main AuthPage component ──────────────────────────────────────────
export default function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    if (mode === "signup" && !form.full_name.trim()) e.full_name = "Name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
    const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

if (!passwordRegex.test(form.password)) {
  e.password =
    "Password must contain uppercase, lowercase, number, special character and be at least 8 characters.";
}
    if (mode === "signup" && form.password !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const user = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await register({ full_name: form.full_name, email: form.email, password: form.password });
      setSuccess(true);
      setTimeout(() => onSuccess(user), 800);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === "login" ? "signup" : "login");
    setErrors({});
    setApiError("");
    setForm({ full_name: "", email: "", password: "", confirm: "" });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontFamily: "'Inter', sans-serif" }}>
      <Stars />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 420, margin: "0 16px",
        background: "rgba(8,12,24,0.85)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(100,160,255,0.15)", borderRadius: 24,
        padding: "40px 36px", boxShadow: "0 0 80px rgba(60,100,200,0.08)",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🚀</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em", textShadow: "0 0 30px rgba(100,160,255,0.4)" }}>
            ISRO PORTAL
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(180,200,255,0.45)", letterSpacing: "0.08em" }}>
            {mode === "login" ? "SIGN IN TO CONTINUE" : "CREATE YOUR ACCOUNT"}
          </p>
        </div>

        {/* Mode toggle tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
          {[["login", "Sign In"], ["signup", "Sign Up"]].map(([m, l]) => (
            <button key={m} type="button" onClick={() => switchMode()}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 9, border: "none", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", fontWeight: 500,
                background: mode === m ? "rgba(100,160,255,0.18)" : "transparent",
                color: mode === m ? "#a8ccff" : "rgba(180,200,255,0.4)",
                boxShadow: mode === m ? "0 0 12px rgba(100,160,255,0.1)" : "none",
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <Field label="Full Name" icon="👤" value={form.full_name} onChange={set("full_name")} placeholder="Dr. Space Explorer" error={errors.full_name} />
          )}
          <Field label="Email Address" type="email" icon="✉️" value={form.email} onChange={set("email")} placeholder="you@isro.gov.in" error={errors.email} />
          <Field label="Password" type="password" icon="🔑" value={form.password} onChange={set("password")} placeholder="Min 8 characters" error={errors.password} />
          {mode === "signup" && (
            <Field label="Confirm Password" type="password" icon="🔒" value={form.confirm} onChange={set("confirm")} placeholder="Re-enter password" error={errors.confirm} />
          )}

          {/* API error */}
          {apiError && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 16 }}>
              ⚠ {apiError}
            </div>
          )}

          {/* Admin note on login */}
          {mode === "login" && (
            <div style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "rgba(250,204,21,0.6)", marginBottom: 16, letterSpacing: "0.03em" }}>
              🔐 Admin accounts are pre-configured. Contact your system administrator for access.
            </div>
          )}

          <button type="submit" disabled={loading || success}
            style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer",
              fontFamily: "'Orbitron', monospace", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em",
              background: success ? "rgba(74,222,128,0.2)" : "linear-gradient(135deg, rgba(60,120,255,0.3), rgba(100,160,255,0.2))",
              color: success ? "#4ade80" : "#a8ccff",
              border: `1px solid ${success ? "rgba(74,222,128,0.4)" : "rgba(100,160,255,0.3)"}`,
              transition: "all 0.25s", opacity: loading ? 0.7 : 1,
              boxShadow: "0 0 20px rgba(60,120,255,0.1)",
            }}>
            {success ? "✓ SUCCESS — LAUNCHING…" : loading ? "AUTHENTICATING…" : mode === "login" ? "✦ SIGN IN" : "✦ CREATE ACCOUNT"}
          </button>
        </form>

        {/* Switch link */}
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(180,200,255,0.4)", marginTop: 20, marginBottom: 0 }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={switchMode}
            style={{ background: "none", border: "none", color: "#7eb8ff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
