import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Respiratory System SVG Illustration ───────────────────────────────────
const LungIllustration = () => (
  <svg viewBox="0 0 200 220" width="200" height="220" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="110" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <circle cx="100" cy="110" r="72" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    <circle cx="100" cy="110" r="54" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <line x1="100" y1="30" x2="100" y2="80" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M100 80 Q80 90 72 105" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M100 80 Q120 90 128 105" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M72 105 Q55 120 58 148 Q62 170 80 175 Q90 178 95 165 L95 105 Z"
      stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="rgba(255,255,255,0.06)"/>
    <path d="M128 105 Q145 120 142 148 Q138 170 120 175 Q110 178 105 165 L105 105 Z"
      stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="rgba(255,255,255,0.06)"/>
    <path d="M72 105 Q65 118 63 130" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M72 105 Q70 122 72 135" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M72 105 Q76 120 78 132" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M128 105 Q135 118 137 130" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M128 105 Q130 122 128 135" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M128 105 Q124 120 122 132" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <circle cx="100" cy="28" r="5" fill="#e9b84a"/>
    <text x="100" y="200" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="11" fontFamily="Georgia, serif" letterSpacing="1">Respiratory System</text>
  </svg>
);

// ── Navbar ─────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.97)" : "#fff",
      borderBottom: "1px solid #e8edf3",
      boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
      transition: "box-shadow 0.2s",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px", height: 60,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #1a3a6b, #2d5fc4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f2647", letterSpacing: "-0.3px", lineHeight: 1.1 }}>
            RespiraTrack
          </div>
          <div style={{ fontSize: 10, color: "#7a8fa6", letterSpacing: "0.2px" }}>
            TB-DOTS Compliance &amp; Inventory System
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {[
          { label: "Home", id: "home" },
          { label: "About TB", id: "about" },
          { label: "TB-DOTS", id: "dots" },
          { label: "Symptoms", id: "symptoms" },
          { label: "Resources", id: "resources" },
        ].map((item, i) => (
          <button key={item.id} onClick={() => scrollTo(item.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 500,
            color: i === 0 ? "#1a3a6b" : "#4a6080",
            borderBottom: i === 0 ? "2px solid #1a3a6b" : "2px solid transparent",
            paddingBottom: 2,
            transition: "color 0.15s",
          }}>
            {item.label}
          </button>
        ))}

        {/* Login button */}
        <button
        onClick={() => navigate("/login")}
        style={{
            background: "#ffffff", color: "#000000",
            border: "none", borderRadius: 8,
            padding: "8px 20px", fontSize: 14,
            fontWeight: 600, cursor: "pointer",
            marginLeft: 8,
        }}
        >
        `
        </button>
      </div>
    </nav>
  );
};

// ── Hero ───────────────────────────────────────────────────────────────────
const Hero = () => (
  <section id="home" style={{
    background: "linear-gradient(135deg, #0f2647 0%, #1a3a6b 50%, #1e4a8a 100%)",
    minHeight: "520px",
    padding: "100px 80px 60px",
    display: "flex", alignItems: "center",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)",
      width: 420, height: 420,
      background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
      borderRadius: "50%",
    }}/>

    <div style={{ flex: 1, maxWidth: 660 }}>
      <div style={{
        display: "inline-block",
        border: "1px solid rgba(255,255,255,0.35)",
        borderRadius: 20, padding: "4px 14px",
        fontSize: 12, color: "rgba(255,255,255,0.85)",
        marginBottom: 28, letterSpacing: "0.3px",
      }}>
        NTP — National TB Control Program
      </div>

      <h1 style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-1px" }}>
        Fighting <span style={{ color: "#e9b84a" }}>Tuberculosis</span>
        <br />one barangay at a time
      </h1>

      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 560, margin: "0 0 40px" }}>
        The Philippines has one of the highest TB burdens in the world. Early detection and completing
        the full DOTS treatment saves lives and stops the spread.
      </p>

      <div style={{ display: "flex", gap: 48 }}>
        {[
          { value: "637", label: "cases per 100K (PH)" },
          { value: "95%", label: "cure rate with DOTS" },
          { value: "6 mo", label: "standard treatment" },
        ].map((stat) => (
          <div key={stat.label}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#e9b84a", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ position: "absolute", right: 120, top: "50%", transform: "translateY(-50%)" }}>
      <LungIllustration />
    </div>
  </section>
);

// ── Warning Banner ─────────────────────────────────────────────────────────
const WarningBanner = () => (
  <div style={{
    background: "#fffbea",
    borderTop: "1px solid #f5d97a",
    borderBottom: "1px solid #f5d97a",
    padding: "14px 80px",
    display: "flex", alignItems: "center", gap: 12,
    fontSize: 14, color: "#5c4a00",
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 6,
      background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92660a" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <span>
      <strong>Know the warning signs</strong> — Persistent cough for 2 or more weeks, unexplained weight loss,
      night sweats, or coughing blood — visit your nearest barangay health center immediately for a free TB screening.
    </span>
  </div>
);

// ── About TB ───────────────────────────────────────────────────────────────
const aboutCards = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e07a30" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="12" cy="12" r="1" fill="#e07a30"/>
      </svg>
    ),
    bg: "#fff3ea", border: "#fcd9bc",
    title: "The bacteria",
    text: "TB is caused by Mycobacterium tuberculosis. It primarily attacks the lungs but can affect the kidneys, spine, and brain.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12a4 4 0 018 0"/>
      </svg>
    ),
    bg: "#eef3ff", border: "#3b6fd4", highlight: true,
    title: "How it spreads",
    text: "TB spreads through the air when an infected person coughs, sneezes, or speaks. Prolonged close contact is the main risk.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d9e5f" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    bg: "#edfaf2", border: "#b6e8c8",
    title: "Is it curable?",
    text: "Yes — TB is fully curable with a complete 6-month course of antibiotics. Stopping early causes drug-resistant TB.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c47a1a" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    bg: "#fff8e6", border: "#fce5a3",
    title: "Who is at risk?",
    text: "People with weakened immune systems, malnutrition, HIV, diabetes, and those in crowded living conditions face higher risk.",
  },
];

const AboutSection = () => (
  <section id="about" style={{ background: "#f0f4f9", padding: "72px 80px" }}>
    <div style={{
      display: "inline-block", border: "1px solid #c8d4e3",
      borderRadius: 20, padding: "3px 12px",
      fontSize: 11, color: "#4a6080", letterSpacing: "0.5px", marginBottom: 20,
      background: "#fff", fontWeight: 600, textTransform: "uppercase",
    }}>
      About TB
    </div>
    <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0f2647", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
      What is tuberculosis?
    </h2>
    <p style={{ fontSize: 15, color: "#5c7490", marginBottom: 36 }}>
      Understanding TB is the first step toward prevention and treatment.
    </p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {aboutCards.map((card) => (
        <div key={card.title} style={{
          background: "#fff",
          border: `1.5px solid ${card.highlight ? card.border : "#e2eaf3"}`,
          borderRadius: 14, padding: "24px 22px",
          boxShadow: card.highlight ? "0 0 0 2px rgba(59,111,212,0.08)" : "none",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: card.bg, display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            {card.icon}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f2647", marginBottom: 8 }}>{card.title}</div>
          <div style={{ fontSize: 13.5, color: "#5c7490", lineHeight: 1.6 }}>{card.text}</div>
        </div>
      ))}
    </div>
  </section>
);

// ── Symptoms ───────────────────────────────────────────────────────────────
const symptoms = [
  "Persistent cough 2+ weeks",
  "Coughing up blood",
  "Low-grade fever",
  "Night sweats",
  "Unexplained weight loss",
  "Fatigue and weakness",
];

const SymptomsSection = () => (
  <section id="symptoms" style={{
    background: "linear-gradient(135deg, #1a3a6b 0%, #1e4a8a 100%)",
    padding: "72px 80px",
  }}>
    <div style={{
      display: "inline-block", border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 20, padding: "3px 12px",
      fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "1px",
      marginBottom: 20, fontWeight: 600, textTransform: "uppercase",
      background: "rgba(255,255,255,0.1)",
    }}>
      Symptoms
    </div>
    <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
      Recognise the symptoms
    </h2>
    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", marginBottom: 36 }}>
      Seek care immediately if you or someone you know experiences any of these:
    </p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
      {symptoms.map((s) => (
        <div key={s} style={{
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 10, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.06)",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e9b84a", flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: "#fff", lineHeight: 1.4, fontWeight: 500 }}>{s}</span>
        </div>
      ))}
    </div>

    <div style={{
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: 10, padding: "18px 24px",
      background: "rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
        TB Hotline — available nationwide
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#e9b84a", letterSpacing: "1px" }}>
        1800-1888-0090
      </div>
    </div>
  </section>
);

// ── DOTS ───────────────────────────────────────────────────────────────────
const dotsSteps = [
  { step: "01", title: "Detection", text: "Sputum smear and Xpert MTB/RIF testing at the health center." },
  { step: "02", title: "Free medicines", text: "Anti-TB drugs provided free of charge through the NTP." },
  { step: "03", title: "Observed intake", text: "A health worker watches the patient take every dose." },
  { step: "04", title: "Drug supply", text: "Uninterrupted medicine stock maintained per barangay." },
  { step: "05", title: "Monitoring", text: "Follow-up sputum tests confirm treatment progress." },
  { step: "06", title: "Reporting", text: "Outcomes reported monthly to the municipal health office." },
];

const DotsSection = () => (
  <section id="dots" style={{ background: "#fff", padding: "72px 80px" }}>
    <div style={{
      display: "inline-block", border: "1px solid #c8d4e3",
      borderRadius: 20, padding: "3px 12px",
      fontSize: 11, color: "#4a6080", letterSpacing: "0.5px", marginBottom: 20,
      background: "#f0f4f9", fontWeight: 600, textTransform: "uppercase",
    }}>
      TB-DOTS Program
    </div>
    <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0f2647", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
      How the DOTS treatment works
    </h2>
    <p style={{ fontSize: 15, color: "#5c7490", marginBottom: 36 }}>
      A structured 6-step process ensures every patient receives complete, supervised care.
    </p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
      {dotsSteps.map((s) => (
        <div key={s.step} style={{
          border: "1.5px solid #dce6f0",
          borderRadius: 12, padding: "20px 18px",
          background: "#f8fafd",
        }}>
          <div style={{ fontSize: 10, color: "#7a9cbf", fontWeight: 700, letterSpacing: "1px", marginBottom: 10 }}>
            STEP {s.step}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0f2647", marginBottom: 8 }}>{s.title}</div>
          <div style={{ fontSize: 12.5, color: "#5c7490", lineHeight: 1.6 }}>{s.text}</div>
        </div>
      ))}
    </div>
  </section>
);

// ── Footer ─────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer id="resources" style={{
    background: "linear-gradient(135deg, #0f2647 0%, #1a3a6b 100%)",
    padding: "56px 80px 24px",
  }}>
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>
          RespiraTrack
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 280 }}>
          A TB-DOTS treatment compliance and medicine inventory system built for the DOH National TB Control Program.
          Serving barangay health workers across the Philippines.
        </p>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#e9b84a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>
          TB Resources
        </div>
        {["About tuberculosis", "DOTS program", "TB hotline: 1800-1888-0090"].map((link) => (
          <div key={link} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginBottom: 10, cursor: "pointer" }}>
            {link}
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#e9b84a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>
          References
        </div>
        {["DOH NTP guidelines", "WHO TB report 2023", "PhilHealth TB benefit", "Contact the NTP"].map((link) => (
          <div key={link} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginBottom: 10, cursor: "pointer" }}>
            {link}
          </div>
        ))}
      </div>
    </div>

    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.1)",
      paddingTop: 20,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
        © 2025 RespiraTrack · Department of Health — Republic of the Philippines
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["DOH", "WHO", "PhilHealth"].map((org) => (
          <div key={org} style={{
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 6, padding: "4px 12px",
            fontSize: 12, color: "rgba(255,255,255,0.6)", cursor: "pointer",
          }}>
            {org}
          </div>
        ))}
      </div>
    </div>
  </footer>
);

// ── Main ───────────────────────────────────────────────────────────────────
const LandingPage = () => (
  <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
    <Navbar />
    <div style={{ paddingTop: 60 }}>
      <Hero />
      <WarningBanner />
      <AboutSection />
      <SymptomsSection />
      <DotsSection />
      <Footer />
    </div>
  </div>
);

export default LandingPage;