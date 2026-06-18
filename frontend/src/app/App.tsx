import { useState, useEffect, useRef } from "react";
import {
  Camera, Upload, Home, Clock, Settings, X, ZapIcon,
  CheckCircle2, FileText, RotateCcw, Save, ChevronRight,
  Eye, EyeOff, Mail, Lock, UserCircle2, User, Bell,
  HardDrive, Shield, ChevronRight as Arrow, LogOut,
  LogIn, Trash2, Info, FileCheck, ScanLine,
  Bookmark, FolderOpen, Folder, Plus, ArrowLeft,
  MoreHorizontal, Image,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "home" | "camera" | "processing" | "results" | "profile" | "history" | "settings" | "saved";

interface AuthState {
  mode: "guest" | "user";
  name?: string;
  email?: string;
}

interface NavProps {
  active: string;
  navigate: (s: Screen) => void;
}

// ─── Shared Field component ───────────────────────────────────────────────────

function Field({
  icon, placeholder, value, onChange, type = "text",
  toggle, onToggle, showToggle,
}: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
  toggle?: boolean; onToggle?: () => void; showToggle?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 rounded-2xl" style={{ backgroundColor: "#F5F5F5", height: "52px" }}>
      <span style={{ color: "#BBBBBB" }}>{icon}</span>
      <input
        type={toggle ? (showToggle ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#BBBBBB]"
        style={{ color: "#1A1A1A", fontFamily: "Inter, sans-serif" }}
      />
      {toggle && (
        <button onClick={onToggle} style={{ color: "#BBBBBB" }}>
          {showToggle ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

// ─── Corner bracket SVG ───────────────────────────────────────────────────────

function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg
      width="36" height="36" viewBox="0 0 36 36" fill="none"
      style={{
        position: "absolute",
        ...(position.includes("r") ? { right: 0 } : { left: 0 }),
        ...(position.includes("b") ? { bottom: 0 } : { top: 0 }),
        transform: `rotate(${position === "tl" ? 0 : position === "tr" ? 90 : position === "bl" ? 270 : 180}deg)`,
      }}
    >
      <path d="M2 20 L2 4 Q2 2 4 2 L20 2" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Screen 1: Home ───────────────────────────────────────────────────────────

function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif" }} className="flex flex-col h-full bg-white">
      <div className="h-11" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#2D7DD2" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect x="6" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
            <rect x="24" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
            <rect x="6" y="24" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
            <path d="M24 31 L38 31 M31 24 L31 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 22 L38 22" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1A1A1A" }}>SmartScan</h1>
        <p className="text-center text-sm leading-relaxed mt-1" style={{ color: "#888888", maxWidth: "240px" }}>
          Detect, align, and classify your documents instantly.
        </p>
      </div>
      <div className="px-6 pb-8 flex flex-col gap-4">
        <button
          onClick={() => navigate("camera")}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-semibold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: "#2D7DD2" }}
        >
          <Camera size={20} /> Scan with Camera
        </button>
        <button
          onClick={() => navigate("processing")}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-semibold text-base transition-all active:scale-95 border-2"
          style={{ borderColor: "#2D7DD2", color: "#2D7DD2" }}
        >
          <Upload size={20} /> Upload Image
        </button>
      </div>
      <BottomNav active="home" navigate={navigate} />
    </div>
  );
}

// ─── Screen 2: Camera ─────────────────────────────────────────────────────────

function CameraScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#111" }}>
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#2a2520 0%,#1a1510 40%,#0f0d0b 100%)" }} />
        <div className="absolute" style={{ top:"28%",left:"12%",right:"12%",bottom:"28%", backgroundColor:"rgba(245,238,220,0.85)", borderRadius:"4px", transform:"rotate(-0.8deg)", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute left-6 right-6 rounded-full" style={{ top:`${18+i*9}%`, height:"2px", backgroundColor:"rgba(80,70,55,0.25)" }} />
          ))}
          <div className="absolute left-6 rounded-sm" style={{ top:"12%", width:"40%", height:"6%", backgroundColor:"rgba(80,70,55,0.2)" }} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(ellipse 70% 60% at 50% 50%,transparent 40%,rgba(0,0,0,0.72) 100%)" }} />
      <div className="relative z-10 flex flex-col h-full" style={{ fontFamily:"Inter, sans-serif" }}>
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={() => navigate("home")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor:"rgba(0,0,0,0.45)" }}>
            <X size={20} color="white" />
          </button>
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor:"rgba(0,0,0,0.45)", color:"rgba(255,255,255,0.85)" }}>Auto-detect on</div>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-xs font-medium mb-4 tracking-wide" style={{ color:"rgba(255,255,255,0.85)" }}>Position document within frame</p>
          <div className="relative" style={{ width:"74%", aspectRatio:"0.707/1" }}>
            {(["tl","tr","bl","br"] as const).map((pos) => (
              <div key={pos} style={{ position:"absolute", ...(pos.includes("r")?{right:0}:{left:0}), ...(pos.includes("b")?{bottom:0}:{top:0}), opacity:pulse?1:0.55, transition:"opacity 0.7s ease-in-out", filter:pulse?"drop-shadow(0 0 6px rgba(255,255,255,0.8))":"none" }}>
                <CornerBracket position={pos} />
              </div>
            ))}
            <div className="absolute inset-0" style={{ border:"1px solid rgba(255,255,255,0.18)", borderRadius:"2px" }} />
          </div>
          <p className="text-xs mt-4 text-center" style={{ color:"rgba(255,255,255,0.6)", maxWidth:"200px" }}>Hold steady — edges will snap automatically.</p>
        </div>
        <div className="flex items-center justify-center pb-12 pt-4 gap-10">
          <div className="w-10 h-10" />
          <button onClick={() => navigate("processing")} className="relative flex items-center justify-center transition-all active:scale-95" style={{ width:"72px", height:"72px", borderRadius:"50%", border:"3px solid white" }}>
            <div className="rounded-full" style={{ width:"58px", height:"58px", backgroundColor:"white" }} />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor:"rgba(255,255,255,0.15)" }}>
            <ZapIcon size={18} color="white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Processing ─────────────────────────────────────────────────────

const STEPS = ["Enhance", "Detect", "Warp", "Classify"];

function ProcessingScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 10), 10);
    let step = 0;
    const advance = () => {
      step += 1;
      setActiveStep(step);
      if (step < STEPS.length) {
        stepRef.current = setTimeout(advance, 600 + Math.random() * 400);
      } else {
        clearInterval(timerRef.current!);
        setTimeout(() => navigate("results"), 400);
      }
    };
    stepRef.current = setTimeout(advance, 700);
    return () => { clearInterval(timerRef.current!); clearTimeout(stepRef.current!); };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full rounded-2xl overflow-hidden shadow-lg" style={{ maxWidth:"280px", aspectRatio:"0.707/1", backgroundColor:"#F5F5F5" }}>
          <div className="w-full h-full p-6 flex flex-col gap-3">
            <div className="w-3/5 h-4 rounded-full" style={{ backgroundColor:"#D0D0D0" }} />
            <div className="w-2/5 h-3 rounded-full" style={{ backgroundColor:"#E0E0E0" }} />
            <div className="mt-2 flex flex-col gap-2">
              {[...Array(9)].map((_,i) => (
                <div key={i} className="rounded-full" style={{ height:"2px", backgroundColor:"#E8E8E8", width:`${70+Math.sin(i*1.7)*20}%` }} />
              ))}
            </div>
            <div className="mt-auto"><div className="w-1/3 h-3 rounded-full" style={{ backgroundColor:"#E0E0E0" }} /></div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="flex gap-2 justify-between">
          {STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep && activeStep < STEPS.length;
            return (
              <div key={step} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-500"
                style={{ backgroundColor: done||active ? "#2D7DD2" : "#F5F5F5", color: done||active ? "white" : "#888888" }}>
                {active && <span className="inline-block w-3 h-3 rounded-full border-2 border-white animate-spin" style={{ borderTopColor:"transparent" }} />}
                {done && <CheckCircle2 size={11} />}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between px-8 mt-1.5">
          {[0,1,2].map((i) => <ChevronRight key={i} size={12} style={{ color: activeStep>i ? "#2D7DD2" : "#D0D0D0" }} />)}
        </div>
      </div>
      <div className="pb-10 flex justify-center">
        <span className="text-xs font-mono" style={{ color:"#BBBBBB" }}>
          {elapsed < 1000 ? `${elapsed}ms` : `${(elapsed/1000).toFixed(2)}s`} elapsed
        </span>
      </div>
    </div>
  );
}

// ─── Screen 4: Results ────────────────────────────────────────────────────────

function ResultsScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const thumbLabels = ["Original","Detected","Regions","Scan"];
  const thumbBg = ["#F5F5F5","#E8F4EC","#EBF3FC","#FAFAFA"];
  const thumbAccent = ["#CCCCCC","#3BB273","#2D7DD2","#1A1A1A"];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:"#F5F5F5", fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />
      <div className="px-5 pt-3 pb-4 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"#888" }}>Scan Result</p>
        <h2 className="text-xl font-bold mt-0.5" style={{ color:"#1A1A1A" }}>Document Analysis</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-4">
        <div className="w-full rounded-2xl overflow-hidden shadow-sm bg-white p-5" style={{ aspectRatio:"0.8/1" }}>
          <div className="w-full h-full flex flex-col gap-2.5">
            <div className="w-3/5 h-4 rounded-full" style={{ backgroundColor:"#D8D8D8" }} />
            <div className="w-2/5 h-2.5 rounded-full" style={{ backgroundColor:"#E8E8E8" }} />
            <div className="mt-2 flex flex-col gap-2">
              {[...Array(12)].map((_,i) => (
                <div key={i} className="rounded-full" style={{ height:"2px", backgroundColor:i===3||i===7?"#C8C8C8":"#EBEBEB", width:`${65+Math.sin(i*2.1)*25}%` }} />
              ))}
            </div>
            <div className="mt-auto flex justify-between items-end">
              <div className="w-1/4 h-3 rounded-full" style={{ backgroundColor:"#E8E8E8" }} />
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor:"#2D7DD2" }}>Invoice</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {thumbLabels.map((label, i) => (
            <div key={label} className="rounded-2xl overflow-hidden" style={{ backgroundColor:thumbBg[i], aspectRatio:"1/0.85" }}>
              <div className="w-full h-full p-3 flex flex-col justify-between">
                <div className="flex flex-col gap-1.5">
                  {[...Array(5)].map((_,j) => (
                    <div key={j} className="rounded-full" style={{ height:"2px", backgroundColor:thumbAccent[i], opacity:i===1?(j===1||j===3?0.9:0.2):0.2, width:`${60+j*8}%` }} />
                  ))}
                </div>
                <span className="text-xs font-semibold" style={{ color:thumbAccent[i]==="#CCCCCC"?"#888":thumbAccent[i] }}>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 rounded-full" style={{ backgroundColor:"#2D7DD2" }}>
          <div className="flex items-center gap-2.5">
            <FileText size={16} color="white" />
            <span className="text-white font-semibold text-sm">Invoice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color:"rgba(255,255,255,0.75)" }}>Confidence</span>
            <span className="text-white font-bold text-sm">97.4%</span>
          </div>
        </div>
        <div className="flex gap-2">
          {[{label:"Latency",value:"55ms"},{label:"Regions",value:"14"},{label:"Found",value:"Yes"}].map(({label,value}) => (
            <div key={label} className="flex-1 flex flex-col items-center py-3 rounded-2xl" style={{ backgroundColor:"white" }}>
              <span className="text-xs" style={{ color:"#888" }}>{label}</span>
              <span className="text-sm font-bold mt-0.5" style={{ color:"#1A1A1A" }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pb-4">
          <button onClick={() => navigate("home")} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2" style={{ borderColor:"#2D7DD2", color:"#2D7DD2" }}>
            <RotateCcw size={16} /> Scan Again
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95" style={{ backgroundColor:"#2D7DD2" }}>
            <Save size={16} /> Save Result
          </button>
        </div>
      </div>
      <BottomNav active="home" navigate={navigate} />
    </div>
  );
}

// ─── Screen 5: History ────────────────────────────────────────────────────────

const HISTORY_ITEMS = [
  { id: 1, type: "Invoice",       file: "Q4_Invoice_Acme.pdf",     confidence: 97.4, regions: 14, latency: "55ms",  date: "Today, 10:42 AM",     size: "1.2 MB", found: true  },
  { id: 2, type: "Passport",      file: "passport_scan_mar.jpg",   confidence: 99.1, regions: 8,  latency: "38ms",  date: "Today, 9:17 AM",      size: "890 KB", found: true  },
  { id: 3, type: "Receipt",       file: "supermarket_rec_0312.jpg",confidence: 91.6, regions: 22, latency: "71ms",  date: "Yesterday, 6:05 PM",  size: "540 KB", found: true  },
  { id: 4, type: "Bank Statement",file: "stmt_feb_barclays.pdf",   confidence: 88.2, regions: 31, latency: "94ms",  date: "Yesterday, 2:30 PM",  size: "2.1 MB", found: true  },
  { id: 5, type: "Unknown",       file: "IMG_20240311_blurry.jpg", confidence: 42.0, regions: 3,  latency: "112ms", date: "Mar 11, 11:58 AM",    size: "3.4 MB", found: false },
  { id: 6, type: "Contract",      file: "NDA_Signed_v3.pdf",       confidence: 96.8, regions: 19, latency: "62ms",  date: "Mar 10, 3:45 PM",     size: "780 KB", found: true  },
  { id: 7, type: "ID Card",       file: "drivers_license_front.jpg",confidence:98.3, regions: 11, latency: "44ms",  date: "Mar 9, 8:20 AM",      size: "620 KB", found: true  },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  "Invoice": FileText,
  "Passport": User,
  "Receipt": FileCheck,
  "Bank Statement": HardDrive,
  "Contract": FileText,
  "ID Card": User,
  "Unknown": ScanLine,
};

function HistoryScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [filter, setFilter] = useState<"all" | "saved">("all");

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-xl font-bold" style={{ color:"#1A1A1A" }}>History</h2>
        <p className="text-xs mt-0.5" style={{ color:"#888" }}>{HISTORY_ITEMS.length} scans total</p>
      </div>

      {/* Filter pills */}
      <div className="px-5 pb-3 flex gap-2">
        {(["all","saved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filter===f ? "#2D7DD2" : "#F5F5F5",
              color: filter===f ? "white" : "#888",
            }}
          >
            {f === "all" ? "All Scans" : "Saved"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-2">
        {HISTORY_ITEMS.map((item) => {
          const Icon = TYPE_ICONS[item.type] ?? FileText;
          const confidenceColor = item.confidence >= 90 ? "#3BB273" : item.confidence >= 70 ? "#F5A623" : "#D4183D";
          return (
            <button
              key={item.id}
              onClick={() => navigate("results")}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{ backgroundColor:"#F8F8F8" }}
            >
              {/* Icon badge */}
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: item.found ? "#EBF3FC" : "#FDF2F2" }}>
                <Icon size={20} style={{ color: item.found ? "#2D7DD2" : "#D4183D" }} strokeWidth={1.75} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold truncate pr-2" style={{ color:"#1A1A1A" }}>{item.type}</span>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color:confidenceColor }}>{item.confidence}%</span>
                </div>
                <p className="text-xs truncate" style={{ color:"#888" }}>{item.file}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color:"#BBBBBB" }}>{item.date}</span>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor:"#D8D8D8" }} />
                  <span className="text-xs" style={{ color:"#BBBBBB" }}>{item.size}</span>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor:"#D8D8D8" }} />
                  <span className="text-xs" style={{ color:"#BBBBBB" }}>{item.latency}</span>
                </div>
              </div>

              <Arrow size={16} style={{ color:"#DDDDDD", flexShrink:0 }} />
            </button>
          );
        })}

        {/* Clear history row */}
        <button className="flex items-center justify-center gap-2 py-3.5 mt-2 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{ color:"#D4183D", backgroundColor:"#FDF2F2" }}>
          <Trash2 size={15} /> Clear History
        </button>
        <div className="pb-2" />
      </div>

      <BottomNav active="history" navigate={navigate} />
    </div>
  );
}

// ─── Screen 6: Profile (auth) ────────────────────────────────────────────────

function ProfileScreen({ onAuth }: { onAuth: (a: AuthState) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor:"#EBF3FC" }}>
          <UserCircle2 size={44} style={{ color:"#2D7DD2" }} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold" style={{ color:"#1A1A1A" }}>
          {tab==="login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-sm mt-1" style={{ color:"#888" }}>
          {tab==="login" ? "Sign in to access your scans" : "Start scanning documents for free"}
        </p>
      </div>

      <div className="px-6 mb-5">
        <div className="flex p-1 rounded-full" style={{ backgroundColor:"#F5F5F5" }}>
          {(["login","signup"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor:tab===t?"white":"transparent", color:tab===t?"#1A1A1A":"#AAAAAA", boxShadow:tab===t?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {t==="login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 flex flex-col gap-3 flex-1 overflow-y-auto">
        {tab==="signup" && <Field icon={<User size={16}/>} placeholder="Full name" value={name} onChange={setName} />}
        <Field icon={<Mail size={16}/>} placeholder="Email address" value={email} onChange={setEmail} type="email" />
        <Field icon={<Lock size={16}/>} placeholder="Password" value={password} onChange={setPassword} toggle showToggle={showPass} onToggle={() => setShowPass(v=>!v)} />
        {tab==="signup" && <Field icon={<Lock size={16}/>} placeholder="Confirm password" value={confirm} onChange={setConfirm} toggle showToggle={showConfirm} onToggle={() => setShowConfirm(v=>!v)} />}
        {tab==="login" && (
          <div className="flex justify-end">
            <button className="text-xs font-medium" style={{ color:"#2D7DD2" }}>Forgot password?</button>
          </div>
        )}
        <button
          onClick={() => onAuth({ mode:"user", name: name || email.split("@")[0] || "User", email })}
          className="w-full py-4 rounded-full font-semibold text-sm text-white mt-2 transition-all active:scale-95"
          style={{ backgroundColor:"#2D7DD2" }}>
          {tab==="login" ? "Log In" : "Create Account"}
        </button>
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ backgroundColor:"#EBEBEB" }} />
          <span className="text-xs" style={{ color:"#BBBBBB" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor:"#EBEBEB" }} />
        </div>
        <button
          onClick={() => onAuth({ mode:"guest" })}
          className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
          style={{ borderColor:"#E0E0E0", color:"#888888" }}>
          Continue as Guest
        </button>
        <div className="pb-4" />
      </div>
    </div>
  );
}

// ─── Screen 7: Settings ───────────────────────────────────────────────────────

function SettingsScreen({ navigate, auth, onSignOut }: { navigate: (s: Screen) => void; auth: AuthState; onSignOut: () => void }) {
  const isGuest = auth.mode === "guest";

  function Row({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
    return (
      <button onClick={onPress} className="flex items-center gap-3 w-full px-4 py-3.5 text-left transition-all active:bg-gray-50">
        <span style={{ color: danger ? "#D4183D" : "#888" }}>{icon}</span>
        <span className="flex-1 text-sm font-medium" style={{ color: danger ? "#D4183D" : "#1A1A1A" }}>{label}</span>
        {value && <span className="text-xs" style={{ color:"#BBBBBB" }}>{value}</span>}
        {!danger && <Arrow size={15} style={{ color:"#DDDDDD" }} />}
      </button>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="mb-4">
        <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color:"#AAAAAA" }}>{title}</p>
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor:"white" }}>
          {children}
        </div>
      </div>
    );
  }

  function Divider() {
    return <div className="mx-4" style={{ height:"1px", backgroundColor:"#F0F0F0" }} />;
  }

  const [notificationsOn, setNotificationsOn] = useState(true);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:"#F5F5F5", fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />

      {/* Header */}
      <div className="px-5 pt-4 pb-4 bg-white border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
        <h2 className="text-xl font-bold" style={{ color:"#1A1A1A" }}>Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto pt-5 pb-2">

        {/* Account card */}
        <div className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor:"white" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isGuest ? "#F5F5F5" : "#EBF3FC" }}>
            <UserCircle2 size={32} style={{ color: isGuest ? "#BBBBBB" : "#2D7DD2" }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color:"#1A1A1A" }}>
              {isGuest ? "Guest User" : auth.name || "User"}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color:"#888" }}>
              {isGuest ? "Not signed in" : auth.email || ""}
            </p>
            {isGuest && (
              <button onClick={() => navigate("profile")}
                className="mt-1.5 text-xs font-semibold" style={{ color:"#2D7DD2" }}>
                Sign in for full access →
              </button>
            )}
          </div>
          {!isGuest && (
            <div className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor:"#EBF3FC", color:"#2D7DD2" }}>Pro</div>
          )}
        </div>

        {/* Preferences */}
        <Section title="Preferences">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span style={{ color:"#888" }}><Bell size={18}/></span>
            <span className="flex-1 text-sm font-medium" style={{ color:"#1A1A1A" }}>Notifications</span>
            <button
              onClick={() => setNotificationsOn(v=>!v)}
              className="relative transition-all"
              style={{ width:"44px", height:"26px", borderRadius:"13px", backgroundColor: notificationsOn ? "#2D7DD2" : "#D8D8D8" }}>
              <div className="absolute top-0.5 transition-all duration-200"
                style={{ width:"22px", height:"22px", borderRadius:"11px", backgroundColor:"white", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", left: notificationsOn ? "20px" : "2px" }} />
            </button>
          </div>
          <Divider />
          <Row icon={<HardDrive size={18}/>} label="Storage Used" value="128 MB" />
          <Divider />
          <Row icon={<ScanLine size={18}/>} label="Default Scan Quality" value="High" />
        </Section>

        {/* Privacy & Legal */}
        <Section title="Privacy & Legal">
          <Row icon={<Shield size={18}/>} label="Privacy Policy" onPress={() => navigate("privacy" as Screen)} />
          <Divider />
          <Row icon={<Info size={18}/>} label="Terms of Service" />
          <Divider />
          <Row icon={<FileText size={18}/>} label="Data & Permissions" />
        </Section>

        {/* About */}
        <Section title="About">
          <Row icon={<Info size={18}/>} label="App Version" value="1.4.2" />
          <Divider />
          <Row icon={<FileCheck size={18}/>} label="Open Source Licences" />
        </Section>

        {/* Auth action */}
        <div className="mx-4 mb-6">
          {isGuest ? (
            <button
              onClick={() => navigate("profile")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95"
              style={{ backgroundColor:"#2D7DD2" }}>
              <LogIn size={17} /> Sign In / Create Account
            </button>
          ) : (
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor:"#FDF2F2", color:"#D4183D" }}>
              <LogOut size={17} /> Sign Out
            </button>
          )}
        </div>
      </div>

      <BottomNav active="settings" navigate={navigate} />
    </div>
  );
}

// ─── Screen 8: Saved ─────────────────────────────────────────────────────────

interface SavedItem {
  id: number;
  name: string;
  type: string;
  date: string;
  size: string;
  confidence: number;
}

interface FolderData {
  id: number;
  name: string;
  color: string;
  emoji: string;
  items: SavedItem[];
}

const FOLDER_COLORS = ["#EBF3FC","#E8F4EC","#FEF3E2","#F3EFFE","#FDF2F2","#E8F8F5"];
const FOLDER_ICON_COLORS = ["#2D7DD2","#3BB273","#F5A623","#8B5CF6","#D4183D","#0EA5E9"];
const FOLDER_EMOJIS = ["🧾","🪪","📄","🏦","📑","🗂️"];

const INITIAL_FOLDERS: FolderData[] = [
  {
    id: 1, name: "Invoices", color: FOLDER_COLORS[0], emoji: FOLDER_EMOJIS[0],
    items: [
      { id: 1, name: "Q4_Invoice_Acme.pdf",        type:"Invoice",  date:"Today, 10:42 AM",   size:"1.2 MB", confidence:97.4 },
      { id: 2, name: "Invoice_Nov_Stripe.pdf",      type:"Invoice",  date:"Nov 14, 3:20 PM",   size:"890 KB", confidence:96.1 },
      { id: 3, name: "supplier_inv_203.jpg",        type:"Invoice",  date:"Nov 2, 9:05 AM",    size:"740 KB", confidence:94.8 },
      { id: 4, name: "Q3_Invoice_AWS.pdf",          type:"Invoice",  date:"Oct 31, 11:00 AM",  size:"1.1 MB", confidence:98.2 },
      { id: 5, name: "freelance_oct_payment.jpg",   type:"Invoice",  date:"Oct 15, 5:30 PM",   size:"620 KB", confidence:92.3 },
    ],
  },
  {
    id: 2, name: "IDs & Passports", color: FOLDER_COLORS[1], emoji: FOLDER_EMOJIS[1],
    items: [
      { id: 6, name: "passport_scan_mar.jpg",       type:"Passport", date:"Today, 9:17 AM",    size:"890 KB", confidence:99.1 },
      { id: 7, name: "drivers_license_front.jpg",   type:"ID Card",  date:"Mar 9, 8:20 AM",    size:"620 KB", confidence:98.3 },
    ],
  },
  {
    id: 3, name: "Contracts", color: FOLDER_COLORS[2], emoji: FOLDER_EMOJIS[2],
    items: [
      { id: 8,  name: "NDA_Signed_v3.pdf",          type:"Contract", date:"Mar 10, 3:45 PM",   size:"780 KB", confidence:96.8 },
      { id: 9,  name: "employment_contract_24.pdf", type:"Contract", date:"Jan 5, 2:00 PM",    size:"1.4 MB", confidence:95.2 },
      { id: 10, name: "lease_agreement_2024.pdf",   type:"Contract", date:"Dec 20, 10:15 AM",  size:"2.2 MB", confidence:97.0 },
    ],
  },
  {
    id: 4, name: "Bank Statements", color: FOLDER_COLORS[3], emoji: FOLDER_EMOJIS[3],
    items: [
      { id: 11, name: "stmt_feb_barclays.pdf",      type:"Statement",date:"Yesterday, 2:30 PM",size:"2.1 MB", confidence:88.2 },
      { id: 12, name: "stmt_jan_hsbc.pdf",          type:"Statement",date:"Feb 1, 8:45 AM",    size:"1.8 MB", confidence:90.5 },
    ],
  },
  {
    id: 5, name: "Receipts", color: FOLDER_COLORS[4], emoji: FOLDER_EMOJIS[4],
    items: [
      { id: 13, name: "supermarket_rec_0312.jpg",   type:"Receipt",  date:"Yesterday, 6:05 PM",size:"540 KB", confidence:91.6 },
      { id: 14, name: "amazon_receipt_mar.jpg",     type:"Receipt",  date:"Mar 8, 1:20 PM",    size:"310 KB", confidence:93.4 },
      { id: 15, name: "pharmacy_rec_0305.jpg",      type:"Receipt",  date:"Mar 5, 4:50 PM",    size:"280 KB", confidence:89.7 },
      { id: 16, name: "coffee_shop_0301.jpg",       type:"Receipt",  date:"Mar 1, 8:10 AM",    size:"190 KB", confidence:87.1 },
      { id: 17, name: "uber_receipt_feb28.jpg",     type:"Receipt",  date:"Feb 28, 11:55 PM",  size:"220 KB", confidence:95.0 },
      { id: 18, name: "grocery_rec_0225.jpg",       type:"Receipt",  date:"Feb 25, 6:30 PM",   size:"460 KB", confidence:92.8 },
      { id: 19, name: "hardware_store_feb.jpg",     type:"Receipt",  date:"Feb 18, 3:00 PM",   size:"350 KB", confidence:90.1 },
      { id: 20, name: "restaurant_0214.jpg",        type:"Receipt",  date:"Feb 14, 8:45 PM",   size:"415 KB", confidence:91.3 },
    ],
  },
];

function SavedScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [folders, setFolders] = useState<FolderData[]>(INITIAL_FOLDERS);
  const [openFolder, setOpenFolder] = useState<FolderData | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const totalItems = folders.reduce((acc, f) => acc + f.items.length, 0);

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const idx = folders.length % FOLDER_COLORS.length;
    const next: FolderData = {
      id: Date.now(), name, color: FOLDER_COLORS[idx], emoji: FOLDER_EMOJIS[idx], items: [],
    };
    setFolders((f) => [...f, next]);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  function deleteFolder(id: number) {
    setFolders((f) => f.filter((x) => x.id !== id));
    setOpenFolder(null);
  }

  // ── Folder detail view ───────────────────────────────────────────────────

  if (openFolder) {
    const folder = folders.find((f) => f.id === openFolder.id) ?? openFolder;
    const folderIdx = INITIAL_FOLDERS.findIndex((f) => f.id === folder.id) % FOLDER_COLORS.length;
    const iconColor = FOLDER_ICON_COLORS[folderIdx >= 0 ? folderIdx : 0];

    return (
      <div className="flex flex-col h-full bg-white" style={{ fontFamily:"Inter, sans-serif" }}>
        <div className="h-11" />

        {/* Detail header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-4">
          <button onClick={() => setOpenFolder(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor:"#F5F5F5" }}>
            <ArrowLeft size={18} style={{ color:"#1A1A1A" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate" style={{ color:"#1A1A1A" }}>{folder.name}</h2>
            <p className="text-xs" style={{ color:"#888" }}>{folder.items.length} {folder.items.length===1?"item":"items"}</p>
          </div>
          <button onClick={() => deleteFolder(folder.id)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor:"#FDF2F2" }}>
            <Trash2 size={16} style={{ color:"#D4183D" }} />
          </button>
        </div>

        {/* Items */}
        {folder.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor:"#F5F5F5" }}>
              <Image size={28} style={{ color:"#CCCCCC" }} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold" style={{ color:"#888" }}>No scans yet</p>
            <p className="text-xs text-center" style={{ color:"#BBBBBB" }}>Scan a document and save it here from the Results screen.</p>
            <button onClick={() => navigate("camera")}
              className="mt-2 px-6 py-3 rounded-full font-semibold text-sm text-white"
              style={{ backgroundColor:"#2D7DD2" }}>
              Scan Now
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-4">
            {folder.items.map((item) => (
              <button key={item.id} onClick={() => navigate("results")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
                style={{ backgroundColor:"#F8F8F8" }}>
                {/* Thumbnail placeholder */}
                <div className="flex-shrink-0 w-12 h-14 rounded-xl overflow-hidden flex flex-col justify-between p-2"
                  style={{ backgroundColor: folder.color }}>
                  {[...Array(4)].map((_,i) => (
                    <div key={i} className="rounded-full" style={{ height:"2px", backgroundColor:iconColor, opacity:0.3, width:`${55+i*10}%` }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:"#1A1A1A" }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color:"#888" }}>{item.type} · {item.size}</p>
                  <p className="text-xs mt-0.5" style={{ color:"#BBBBBB" }}>{item.date}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: item.confidence >= 90 ? "#3BB273" : "#F5A623" }}>
                    {item.confidence}%
                  </span>
                  <Arrow size={14} style={{ color:"#DDDDDD" }} />
                </div>
              </button>
            ))}
          </div>
        )}

        <BottomNav active="saved" navigate={navigate} />
      </div>
    );
  }

  // ── Folder grid view ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:"#F5F5F5", fontFamily:"Inter, sans-serif" }}>
      <div className="h-11" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-white flex items-center justify-between border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color:"#1A1A1A" }}>Saved</h2>
          <p className="text-xs mt-0.5" style={{ color:"#888" }}>{folders.length} folders · {totalItems} scans</p>
        </div>
        <button onClick={() => setShowNewFolder(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor:"#2D7DD2" }}>
          <Plus size={18} color="white" />
        </button>
      </div>

      {/* Folder grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {folders.map((folder, fi) => {
            const iconColor = FOLDER_ICON_COLORS[fi % FOLDER_ICON_COLORS.length];
            return (
              <button key={folder.id} onClick={() => setOpenFolder(folder)}
                className="flex flex-col p-4 rounded-2xl text-left active:scale-[0.97] transition-all"
                style={{ backgroundColor:"white" }}>
                {/* Folder icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: folder.color }}>
                  <FolderOpen size={24} style={{ color: iconColor }} strokeWidth={1.75} />
                </div>
                <p className="text-sm font-bold leading-tight" style={{ color:"#1A1A1A" }}>{folder.name}</p>
                <p className="text-xs mt-1" style={{ color:"#AAAAAA" }}>
                  {folder.items.length} {folder.items.length === 1 ? "scan" : "scans"}
                </p>
                {/* Mini thumbnail strip */}
                {folder.items.length > 0 && (
                  <div className="flex gap-1 mt-3">
                    {folder.items.slice(0, 3).map((_, i) => (
                      <div key={i} className="flex-1 rounded-md" style={{ height:"28px", backgroundColor: folder.color, opacity: 1 - i * 0.2 }} />
                    ))}
                    {folder.items.length > 3 && (
                      <div className="flex-1 rounded-md flex items-center justify-center" style={{ height:"28px", backgroundColor:"#F0F0F0" }}>
                        <span className="text-xs font-semibold" style={{ color:"#AAAAAA" }}>+{folder.items.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* New folder shortcut */}
          <button onClick={() => setShowNewFolder(true)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl active:scale-[0.97] transition-all border-2 border-dashed"
            style={{ borderColor:"#E0E0E0", minHeight:"140px" }}>
            <Plus size={24} style={{ color:"#CCCCCC" }} />
            <p className="text-xs font-semibold mt-2" style={{ color:"#CCCCCC" }}>New Folder</p>
          </button>
        </div>
      </div>

      <BottomNav active="saved" navigate={navigate} />

      {/* New folder sheet */}
      {showNewFolder && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor:"rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor:"#E0E0E0" }} />
            <h3 className="text-base font-bold mb-4" style={{ color:"#1A1A1A" }}>New Folder</h3>
            <div className="flex items-center gap-3 px-4 rounded-2xl mb-4" style={{ backgroundColor:"#F5F5F5", height:"52px" }}>
              <Folder size={16} style={{ color:"#BBBBBB" }} />
              <input
                autoFocus
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color:"#1A1A1A", fontFamily:"Inter, sans-serif" }}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2 transition-all"
                style={{ borderColor:"#E0E0E0", color:"#888" }}>
                Cancel
              </button>
              <button onClick={createFolder}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all"
                style={{ backgroundColor: newFolderName.trim() ? "#2D7DD2" : "#C0D8F0" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav({ active, navigate }: NavProps) {
  const items: { id: Screen; Icon: React.ElementType; label: string }[] = [
    { id:"home",     Icon: Home,     label:"Home"    },
    { id:"history",  Icon: Clock,    label:"History" },
    { id:"saved",    Icon: Bookmark, label:"Saved"   },
    { id:"settings", Icon: Settings, label:"Settings"},
  ];

  return (
    <div className="flex items-center justify-around px-4 pb-8 pt-3 border-t"
      style={{ borderColor:"rgba(0,0,0,0.07)", backgroundColor:"white", fontFamily:"Inter, sans-serif" }}>
      {items.map(({ id, Icon, label }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => navigate(id)} className="flex flex-col items-center gap-1 py-1">
            <Icon size={22} style={{ color: isActive ? "#2D7DD2" : "#BBBBBB" }} strokeWidth={isActive ? 2.5 : 1.75} />
            <span className="text-xs font-medium" style={{ color: isActive ? "#2D7DD2" : "#BBBBBB" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ width:"390px", height:"844px", borderRadius:"52px", boxShadow:"0 0 0 2px #E0E0E0,0 0 0 4px #C8C8C8,0 32px 80px rgba(0,0,0,0.22),inset 0 0 0 1px rgba(255,255,255,0.6)", backgroundColor:"#1A1A1A", flexShrink:0 }}>
      <div className="absolute top-3.5 left-1/2 z-50 flex items-center justify-center"
        style={{ transform:"translateX(-50%)", width:"126px", height:"36px", backgroundColor:"#1A1A1A", borderRadius:"20px" }}>
        <div className="w-3 h-3 rounded-full ml-8" style={{ backgroundColor:"#2a2a2a", border:"1px solid #333" }} />
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius:"52px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Screen tabs (outside phone) ─────────────────────────────────────────────

const SCREEN_LABELS: { id: Screen; label: string }[] = [
  { id:"home",       label:"Home"       },
  { id:"camera",     label:"Camera"     },
  { id:"processing", label:"Processing" },
  { id:"results",    label:"Results"    },
  { id:"history",    label:"History"    },
  { id:"saved",      label:"Saved"      },
  { id:"settings",   label:"Settings"   },
  { id:"profile",    label:"Profile"    },
];

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [auth, setAuth] = useState<AuthState>({ mode:"guest" });

  function navigate(s: Screen) { setScreen(s); }

  function handleAuth(a: AuthState) {
    setAuth(a);
    navigate("home");
  }

  function handleSignOut() {
    setAuth({ mode:"guest" });
    navigate("home");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 gap-8" style={{ backgroundColor:"#F0F2F5", fontFamily:"Inter, sans-serif" }}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor:"#2D7DD2" }}>
            <svg width="16" height="16" viewBox="0 0 44 44" fill="none">
              <rect x="6" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="3" fill="none" />
              <rect x="24" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="3" fill="none" />
              <rect x="6" y="24" width="14" height="14" rx="2" stroke="white" strokeWidth="3" fill="none" />
              <path d="M24 31 L38 31 M31 24 L31 38" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color:"#1A1A1A" }}>SmartScan</span>
        </div>
        <p className="text-xs" style={{ color:"#888" }}>Mobile App — Design Prototype</p>
      </div>

      {/* Tab row */}
      <div className="flex flex-wrap justify-center gap-1 p-1 rounded-full" style={{ backgroundColor:"rgba(0,0,0,0.08)" }}>
        {SCREEN_LABELS.map(({ id, label }) => (
          <button key={id} onClick={() => setScreen(id)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor:screen===id?"white":"transparent", color:screen===id?"#1A1A1A":"#888888", boxShadow:screen===id?"0 1px 4px rgba(0,0,0,0.12)":"none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Phone */}
      <PhoneFrame>
        {screen==="home"       && <HomeScreen navigate={navigate} />}
        {screen==="camera"     && <CameraScreen navigate={navigate} />}
        {screen==="processing" && <ProcessingScreen key={Date.now()} navigate={navigate} />}
        {screen==="results"    && <ResultsScreen navigate={navigate} />}
        {screen==="history"    && <HistoryScreen navigate={navigate} />}
        {screen==="saved"      && <SavedScreen navigate={navigate} />}
        {screen==="settings"   && <SettingsScreen navigate={navigate} auth={auth} onSignOut={handleSignOut} />}
        {screen==="profile"    && <ProfileScreen onAuth={handleAuth} />}
      </PhoneFrame>

      <p className="text-xs" style={{ color:"#AAAAAA" }}>Tap buttons inside the phone to navigate between screens</p>
    </div>
  );
}
