import React, { useEffect, useMemo, useState } from "react";
import { Radio, MapPin, Clock, Antenna, Activity, Mail, Globe2, Filter } from "lucide-react";
import { motion } from "framer-motion";

// --- UI mini ---
const Badge = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90 backdrop-blur">
    {children}
  </span>
);
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/20 ${className}`}>
    {children}
  </div>
);
const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 p-2"><Icon className="size-5" /></div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
    {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
  </div>
);

// --- Fallback local (si Google falla) ---
const DEFAULT_QSOS = [
  { date: "2025-08-09", time: "23:11", call: "PY2XYZ", band: "20m", mode: "SSB", qth: "São Paulo", notes: "Apertura fuerte" },
  { date: "2025-08-08", time: "01:42", call: "CE3ABC", band: "40m", mode: "FT8", qth: "Santiago", notes: "" },
];

// 👉 Reemplazá por tu Sheet:
const SHEET_ID = "1cQjYZLIzG9mBbZe7QE4X9phB65ZdT4-LU5qQogVsrCc";
const GID = "0"; // pestaña (gid) de tu hoja
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

// Parseo del JSON “envuelto” de Google
function parseGvizJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Formato inesperado");
  return JSON.parse(text.slice(start, end + 1));
}
function mapRowsToQsos(obj) {
  const cols = obj.table.cols.map(c => (c && c.label ? c.label.toLowerCase() : ""));
  const get = (row, name) => {
    const idx = cols.indexOf(name);
    if (idx === -1) return "";
    const cell = row.c[idx];
    return cell ? (cell.v ?? "") : "";
  };
  return (obj.table.rows || []).map(r => ({
    date: String(get(r, "date")),
    time: String(get(r, "time")),
    call: String(get(r, "call")),
    band: String(get(r, "band")),
    mode: String(get(r, "mode")),
    qth: String(get(r, "qth")),
    notes: String(get(r, "notes")),
  })).filter(x => x.call);
}

export default function LU4CBN_Page() {
  // Estado QRV/QRT
  const [onAir, setOnAir] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("lu4cbn_onair");
    if (stored) setOnAir(stored === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("lu4cbn_onair", onAir ? "true" : "false");
  }, [onAir]);

  // Perfil
  const profile = {
    callsign: "LU4CBN",
    name: "Baltasar",
    qth: "Buenos Aires, Argentina",
    grid: "GF05 (aprox)",
    email: "lu4cbn@gmail.com",
    website: "https://www.qrz.com/db/LU4CBN",
  };

  // QSOs (Google Sheets)
  const [qsos, setQsos] = useState(DEFAULT_QSOS);
  useEffect(() => {
    if (!SHEET_ID) return;
    fetch(`${SHEET_URL}&_ts=${Date.now()}`)
      .then(r => r.text())
      .then(txt => {
        const obj = parseGvizJson(txt);
        const list = mapRowsToQsos(obj);
        if (list.length) setQsos(list);
      })
      .catch(() => {/* fallback silencioso */});
  }, []);

  // Filtro
  const [filter, setFilter] = useState("");
  const filteredQsos = useMemo(() => {
    const f = filter.toLowerCase();
    return qsos.filter((q) =>
      [q.date, q.time, q.call, q.band, q.mode, q.qth, q.notes]
        .some(v => String(v ?? "").toLowerCase().includes(f))
    );
  }, [qsos, filter]);

  // Export CSV (sin RST)
  function exportCSV() {
    const headers = ["Fecha","Hora","Indicativo","Banda","Modo","QTH","Notas"];
    const rows = qsos.map(q=>[
      q.date, q.time, q.call, q.band, q.mode, q.qth, `"${String(q.notes||"").replaceAll('"','""')}"`
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${profile.callsign}_logbook.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Reloj UTC + Último QSO
  const [utc, setUtc] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setUtc(new Date()), 1000); return () => clearInterval(t); }, []);
  const utcHHMM = utc.toUTCString().slice(17,22);
  const lastQSO = useMemo(() => {
    if (!qsos.length) return null;
    return [...qsos].sort((a,b)=> (new Date(b.date+'T'+b.time)) - (new Date(a.date+'T'+a.time)))[0];
  }, [qsos]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2"><Radio className="size-5" /></div>
            <a href="#home" className="text-sm font-semibold tracking-wider text-white/90">{profile.callsign}</a>
            <span className="hidden text-xs text-white/50 sm:inline">• {profile.qth}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Estado: QRV/QRT */}
            <button onClick={()=>setOnAir(v=>!v)} className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${onAir?"border-emerald-400/50 bg-emerald-400/10":"border-white/10 bg-white/5"}`}>
              <Activity className={`size-4 ${onAir?"animate-pulse":''}`} />
              {onAir ? "QRV" : "QRT"}
            </button>
            {/* Idioma: ES activo / EN inactivo */}
            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button className="rounded-full bg-white/10 px-2 py-0.5 font-semibold">ES</button>
              <button disabled className="cursor-not-allowed rounded-full px-2 py-0.5 opacity-40">EN</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section id="home" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.6}} className="mx-auto max-w-6xl px-4 pb-8 pt-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h1 className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              {profile.callsign}
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Radioaficionado — {profile.qth}. Grid {profile.grid}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge><Antenna className="size-3"/> HF/VHF/UHF</Badge>
              <Badge>SSB</Badge>
              <Badge>CW (aprendiendo)</Badge>
              <Badge>FT8/FT4</Badge>
              <Badge>FM / DMR</Badge>
            </div>
          </div>

          {/* Vida: UTC + último QSO */}
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Clock className="size-4"/> UTC {utcHHMM}
            {lastQSO && (
              <span className="ml-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <Radio className="size-3"/>
                Último QSO: {lastQSO.call} · {lastQSO.band} · {lastQSO.mode}
              </span>
            )}
          </div>
        </div>
      </motion.section>

      {/* Contenido */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-5">
        {/* Izquierda */}
        <div className="md:col-span-3">
          <Card>
            <SectionTitle icon={Globe2} title="Acerca & QTH" subtitle="Quién / dónde / cómo" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-white/80">
                  Hola! Soy Baltasar (LU4CBN). Opero mucho en portable, suelo buscar DX y estoy aprendiendo sobre antenas.
                  Cuando modulo fuera de CABA suelo estar presente <span className="font-mono">/E</span> por Bahía Blanca.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge><MapPin className="size-3"/> {profile.qth}</Badge>
                  <Badge>Grid {profile.grid}</Badge>
                  <Badge><Clock className="size-3"/> Mejores horarios: Noche 20m/40m</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Política de QSL</p>
                <ul className="space-y-1 text-sm text-white/80">
                  <li>• Enviar QSL por email: <a href={`mailto:${profile.email}`} className="text-emerald-300 hover:underline">{profile.email}</a></li>
                  <li>• eQSL: en progreso.</li>
                  <li>• QSL en papel: en progreso.</li>
                </ul>
                <a href={profile.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-emerald-300 hover:underline">Página en QRZ →</a>
              </div>
            </div>
          </Card>

          {/* Log (solo lectura) */}
          <Card className="mt-6">
            <SectionTitle icon={Clock} title="Log reciente" subtitle="Filtro y exportación CSV" />
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-white/50"/>
                  <input
                    placeholder="Filtrar por indicativo/banda/modo/QTH..."
                    value={filter}
                    onChange={(e)=>setFilter(e.target.value)}
                    className="w-72 rounded-lg border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-sm outline-none ring-emerald-500/50 placeholder:text-white/40 focus:ring"
                  />
                </div>
                <button onClick={exportCSV} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                  Exportar CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-white/60">
                  <tr className="border-b border-white/10">
                    {["Fecha","Hora","Indicativo","Banda","Modo","QTH","Notas"].map(h=> (
                      <th key={h} className="px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQsos.map((q, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-2 py-2 font-mono text-xs">{q.date}</td>
                      <td className="px-2 py-2 font-mono text-xs">{q.time}</td>
                      <td className="px-2 py-2 font-semibold">{q.call}</td>
                      <td className="px-2 py-2">{q.band}</td>
                      <td className="px-2 py-2">{q.mode}</td>
                      <td className="px-2 py-2">{q.qth}</td>
                      <td className="px-2 py-2 text-white/80">{q.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Derecha */}
        <div className="md:col-span-2">
          <Card>
            <SectionTitle icon={Radio} title="Equipamiento de estación y portátil" subtitle="Edita para que coincida con tu shack" />
            <ul className="space-y-3 text-sm text-white/80">
              <li>
                <p className="font-semibold">HF: Yaesu FT-891</p>
                <p className="text-white/60">10–160m portable. End-fed half-wave y dipolo de 40m.</p>
              </li>
              <li>
                <p className="font-semibold">VHF/UHF: Handheld</p>
                <p className="text-white/60">Repetidoras y simple en 2m/70cm; pruebas con DMR/hotspot.</p>
              </li>
              <li>
                <p className="font-semibold">Antenas</p>
                <p className="text-white/60">EFHW 10–40m, dipolo linkeado 20/40, mag-mount VHF/UHF.</p>
              </li>
              <li>
                <p className="font-semibold">Log</p>
                <p className="text-white/60">CSV de solo lectura; usá “Exportar CSV” para tu logger.</p>
              </li>
            </ul>
          </Card>

          {/* Contacto & QSL */}
          <Card className="mt-6">
            <SectionTitle icon={Mail} title="Contacto & QSL" subtitle="Recibo QSLs" />
            <div className="space-y-3 text-sm">
              <p>Email: <a href={`mailto:${profile.email}`} className="text-emerald-300 hover:underline">{profile.email}</a></p>
              <p>Sitio: <a href={profile.website} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">{profile.website}</a></p>
              <p className="text-white/70">QSL por email (activa). eQSL y QSL física: en progreso.</p>
            </div>
          </Card>
        </div>
      </main>

      {/* Pie */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-white/60 sm:flex-row">
          <p>© 2025 {profile.callsign} — {profile.qth}</p>
        </div>
      </footer>
    </div>
  );
}
