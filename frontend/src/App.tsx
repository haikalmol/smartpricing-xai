import { useState, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Info,
  CloudRain,
  Check,
  X,
  Search,
  Plus,
  ArrowLeft,
  Save,
  User,
  Package,
  BrainCircuit,
  LayoutList,
  Settings,
  LogOut,
  HelpCircle,
  FileText,
  Edit3,
  CheckCircle,
  TrendingUp,
  Bike,
  Waves,
  MapPin,
  Home,
  Sparkles,
} from "lucide-react";

type Tab = "saran" | "katalog" | "input" | "akun";

// ─── Shared Data ─────────────────────────────────────────────────────────────
const layananData = [
  { nama: "Sewa Motor", harga: "Rp 100.000/hari", hpp: "50.000", hargaNum: 100000, hppNum: 50000, icon: Bike, color: "#F59E0B", colorBg: "#FFFBEB" },
  { nama: "Paket Snorkeling", harga: "Rp 150.000/orang", hpp: "80.000", hargaNum: 150000, hppNum: 80000, icon: Waves, color: "#2563EB", colorBg: "#EFF6FF" },
  { nama: "Guide Wisata Lokal", harga: "Rp 200.000/hari", hpp: "90.000", hargaNum: 200000, hppNum: 90000, icon: MapPin, color: "#7C3AED", colorBg: "#F5F3FF" },
  { nama: "Kamar Homestay", harga: "Rp 250.000/malam", hpp: "120.000", hargaNum: 250000, hppNum: 120000, icon: Home, color: "#16A34A", colorBg: "#F0FDF4" },
];

// ─── Bottom Tab Bar ──────────────────────────────────────────────────────────
function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "saran",   label: "Saran AI",   icon: <BrainCircuit size={21} /> },
    { id: "katalog", label: "Katalog",    icon: <LayoutList size={21} /> },
    { id: "input",   label: "Input HPP",  icon: <Settings size={21} /> },
    { id: "akun",    label: "Akun",       icon: <User size={21} /> },
  ];
  return (
    <nav className="flex-shrink-0 bg-card border-t border-border flex">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 flex flex-col items-center pt-2.5 pb-3 gap-0.5 relative"
        >
          {/* Active pip */}
          {active === t.id && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary" />
          )}
          <span className={`transition-colors ${active === t.id ? "text-primary" : "text-muted-foreground"}`}>
            {t.icon}
          </span>
          <span className={`text-[10.5px] font-semibold transition-colors ${active === t.id ? "text-primary" : "text-muted-foreground"}`}>
            {t.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ─── Screen wrapper with fade-in ─────────────────────────────────────────────
function Screen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={`flex flex-col flex-1 min-h-0 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  );
}

// ─── Screen 1: Saran AI ──────────────────────────────────────────────────────
function SaranAI({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [alasanOpen, setAlasanOpen] = useState(false);
  const [decision, setDecision] = useState<"setuju" | "tolak" | null>(null);

  // Margin calc: harga diskon 10% dari Rp 100k = Rp 90k, HPP Rp 50k
  const hargaDiskon = 90000;
  const hppVal = 50000;
  const marginPct = Math.round(((hargaDiskon - hppVal) / hppVal) * 100);
  const barPct = Math.round(((hargaDiskon - hppVal) / hargaDiskon) * 100);

  return (
    <Screen>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-tight">SmartPricing XAI</span>
        </div>
        <button className="relative w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center" aria-label="Notifikasi">
          <Bell size={19} className="text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card" />
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Service Dropdown */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Pilih Layanan</p>
          <button className="w-full bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors">
            <span className="text-[14.5px] font-semibold text-foreground">Paket Snorkeling (Rp150k/orang)</span>
            <ChevronDown size={17} className="text-muted-foreground flex-shrink-0 ml-2" />
          </button>
        </div>

        {/* Section Header */}
        <div className="flex items-center gap-2 pt-1">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-[14px] font-bold text-foreground">Strategi Promo Silang</h2>
          <button className="text-muted-foreground hover:text-primary transition-colors ml-0.5" aria-label="Info">
            <Info size={14} />
          </button>
        </div>

        {/* AI Recommendation Card — hero */}
        <div
          className="bg-card rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 4px 24px rgba(37,99,235,0.12), 0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid rgba(37,99,235,0.18)",
          }}
        >
          {/* Blue left accent bar — 4px */}
          <div className="flex">
            <div className="w-1 bg-primary flex-shrink-0" style={{ background: "linear-gradient(to bottom, #2563EB, #1E40AF)" }} />
            <div className="flex-1 p-4" style={{ background: "linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 60%)" }}>
              {/* AI label pill */}
              <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-2.5 py-1 mb-3">
                <BrainCircuit size={11} className="text-primary" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Rekomendasi AI</span>
              </div>

              {/* Title */}
              <p className="text-[15.5px] font-bold text-foreground leading-[1.45] mb-3">
                Saran AI: Berikan Diskon 10% Sewa Motor untuk Tamu Homestay Anda
              </p>

              {/* Safety Badge */}
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-3">
                <CheckCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-green-800 leading-snug">
                  <span className="font-bold">Aman:</span> Harga diskon 10% masih di atas HPP (Rp 50rb). Margin aman.
                </p>
              </div>

              {/* Margin Visual Bar */}
              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground font-medium">HPP (Rp 50rb)</span>
                  <span className="text-[11px] font-bold text-green-700">Margin {marginPct}%</span>
                  <span className="text-[11px] text-muted-foreground font-medium">Harga diskon (Rp 90rb)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {decision === null ? (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setDecision("setuju")}
                    className="flex-1 bg-primary text-white font-bold rounded-xl py-3 text-[14.5px] hover:bg-blue-700 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 min-h-[48px] shadow-sm"
                  >
                    <Check size={16} />
                    Setuju
                  </button>
                  <button
                    onClick={() => setDecision("tolak")}
                    className="flex-1 border-2 border-slate-200 text-slate-500 font-bold rounded-xl py-3 text-[14.5px] hover:bg-slate-50 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 min-h-[48px]"
                  >
                    <X size={16} />
                    Tolak
                  </button>
                </div>
              ) : (
                <div className={`rounded-xl px-3.5 py-3 flex items-center gap-2.5 ${decision === "setuju" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  {decision === "setuju" ? (
                    <>
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check size={14} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-green-800 font-bold text-[13px]">Promo disetujui dan aktif!</p>
                        <p className="text-green-600 text-[11px]">Diskon 10% berlaku untuk tamu homestay</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <X size={14} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-red-700 font-bold text-[13px]">Rekomendasi ditolak.</p>
                        <p className="text-red-400 text-[11px]">Harga tetap seperti semula</p>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => setDecision(null)}
                    className="ml-auto text-[11px] text-muted-foreground underline flex-shrink-0"
                  >
                    Ubah
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alasan Algoritma — Collapsible */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setAlasanOpen(!alasanOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info size={15} className="text-muted-foreground" />
              <span className="text-[13.5px] font-bold text-foreground">Alasan Algoritma</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${alasanOpen ? "rotate-180" : ""}`}
            />
          </button>
          {alasanOpen && (
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CloudRain size={13} className="text-blue-600" />
                </div>
                <p className="text-[13px] text-foreground leading-snug">
                  <span className="font-semibold">Cuaca: Mendung</span> — wisata diprediksi ramai akhir pekan ini.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp size={13} className="text-amber-600" />
                </div>
                <p className="text-[13px] text-foreground leading-snug">
                  Tingkat bundel layanan serupa naik <span className="font-semibold">23%</span> 2 minggu terakhir.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* breathing room above nav */}
        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Screen 2: Katalog ───────────────────────────────────────────────────────
function Katalog({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [query, setQuery] = useState("");
  const filtered = layananData.filter((l) =>
    l.nama.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Screen>
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-[16px] font-bold text-foreground">Katalog Layanan</h1>
        <button className="bg-primary text-white text-[12.5px] font-bold rounded-xl px-3 py-2 flex items-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all min-h-[36px] shadow-sm">
          <Plus size={14} />
          Tambah
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari layanan..."
            className="w-full bg-card border border-border rounded-2xl pl-9.5 pr-4 py-3 text-[14.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            style={{ paddingLeft: "2.5rem" }}
          />
        </div>

        {/* Count label */}
        <p className="text-[11px] font-semibold text-muted-foreground px-0.5">
          {filtered.length} layanan tersedia
        </p>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((l, i) => {
            const Icon = l.icon;
            const marginPct = Math.round(((l.hargaNum - l.hppNum) / l.hppNum) * 100);
            return (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3.5"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)" }}
              >
                {/* Service icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: l.colorBg }}
                >
                  <Icon size={18} style={{ color: l.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-bold text-foreground leading-tight">{l.nama}</p>
                  <p className="text-[13px] text-foreground font-semibold mt-0.5">{l.harga}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => onNavigate("input")}
                      className="text-[11px] text-primary font-bold hover:underline"
                    >
                      Lihat HPP
                    </button>
                    <span className="text-[11px] text-green-700 font-semibold bg-green-50 px-1.5 py-0.5 rounded-md">
                      Margin {marginPct}%
                    </span>
                  </div>
                </div>

                {/* Edit */}
                <button className="border border-slate-200 text-slate-500 text-[12.5px] font-semibold rounded-xl px-3 py-2 hover:bg-muted active:scale-95 transition-all flex items-center gap-1.5 min-h-[38px] flex-shrink-0">
                  <Edit3 size={12} />
                  Edit
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <Search size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-muted-foreground text-[14px]">Tidak ada layanan ditemukan.</p>
            </div>
          )}
        </div>
        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Screen 3: Input HPP ─────────────────────────────────────────────────────
function InputHPP({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [layanan, setLayanan] = useState("Sewa Motor");
  const [hargaNormal, setHargaNormal] = useState("100.000");
  const [hpp, setHpp] = useState("50.000");
  const [saved, setSaved] = useState(false);

  const selectedLayanan = layananData.find((l) => l.nama === layanan);
  const hargaNum = parseInt(hargaNormal.replace(/\./g, "")) || 0;
  const hppNum = parseInt(hpp.replace(/\./g, "")) || 0;
  const marginPct = hargaNum > 0 && hppNum > 0 ? Math.round(((hargaNum - hppNum) / hargaNum) * 100) : 0;
  const isSafe = hppNum < hargaNum;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Screen>
      {/* Header */}
      <header className="bg-card border-b border-border px-2 py-2.5 flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onNavigate("katalog")}
          className="w-10 h-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center flex-shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft size={19} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-[15px] font-bold text-foreground text-center">
          Atur Harga Pokok (HPP)
        </h1>
        <button
          onClick={handleSave}
          className="w-10 h-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center flex-shrink-0"
          aria-label="Simpan"
        >
          <Save size={19} className={saved ? "text-green-600" : "text-foreground"} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-blue-800 leading-snug">
            <span className="font-bold">HPP (Harga Pokok Penjualan)</span> adalah biaya modal Anda. AI tidak akan pernah menyarankan harga di bawah batas ini.
          </p>
        </div>

        {/* Service Dropdown */}
        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Pilih Layanan
          </label>
          <div className="relative">
            <select
              value={layanan}
              onChange={(e) => setLayanan(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-[14.5px] font-semibold text-foreground appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-10"
            >
              {layananData.map((l) => (
                <option key={l.nama} value={l.nama}>{l.nama}</option>
              ))}
            </select>
            <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Harga Normal */}
        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Harga Normal Saat Ini
          </label>
          <div className="flex items-center bg-card border border-border rounded-2xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <span className="px-4 py-3.5 text-[14px] font-bold text-muted-foreground border-r border-border bg-muted/50 min-w-[52px] text-center flex-shrink-0">
              Rp
            </span>
            <input
              value={hargaNormal}
              onChange={(e) => setHargaNormal(e.target.value)}
              type="text"
              inputMode="numeric"
              className="flex-1 px-4 py-3.5 text-[15px] font-semibold text-foreground bg-transparent focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>

        {/* HPP Field */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              Harga Pokok / Modal (HPP)
            </label>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Batas minimum
            </span>
          </div>
          <div className="flex items-center bg-card border-2 border-amber-400 rounded-2xl overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <span className="px-4 py-3.5 text-[14px] font-bold text-amber-700 border-r border-amber-200 bg-amber-50 min-w-[52px] text-center flex-shrink-0">
              Rp
            </span>
            <input
              value={hpp}
              onChange={(e) => setHpp(e.target.value)}
              type="text"
              inputMode="numeric"
              className="flex-1 px-4 py-3.5 text-[15px] font-semibold text-foreground bg-transparent focus:outline-none"
              placeholder="0"
            />
          </div>
          <p className="text-[11.5px] text-amber-600 mt-1.5 flex items-center gap-1.5">
            <Info size={11} />
            AI tidak akan merekomendasikan harga di bawah nilai ini.
          </p>
        </div>

        {/* Live Margin Preview */}
        {hargaNum > 0 && hppNum > 0 && (
          <div className={`rounded-2xl px-4 py-3.5 border ${isSafe ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-muted-foreground">Preview Margin</span>
              <span className={`text-[13px] font-bold ${isSafe ? "text-green-700" : "text-red-600"}`}>
                {isSafe ? `+${marginPct}% margin` : "⚠ HPP melebihi harga!"}
              </span>
            </div>
            <div className="h-1.5 bg-white border border-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isSafe ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(marginPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full font-bold rounded-2xl py-4 text-[15.5px] transition-all flex items-center justify-center gap-2 min-h-[54px] active:scale-[0.98] shadow-sm ${
            saved
              ? "bg-green-600 text-white"
              : "bg-primary text-white hover:bg-blue-700"
          }`}
          style={!saved ? { boxShadow: "0 4px 14px rgba(37,99,235,0.35)" } : {}}
        >
          {saved ? (
            <><Check size={18} />Data Tersimpan!</>
          ) : (
            <><Save size={18} />Simpan Data HPP</>
          )}
        </button>

        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Screen 4: Akun ──────────────────────────────────────────────────────────
function Akun({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [notifOn, setNotifOn] = useState(true);

  return (
    <Screen>
      <header className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
        <h1 className="text-[16px] font-bold text-foreground">Akun Saya</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Profile Card */}
        <div
          className="bg-card rounded-2xl px-4 py-4 flex items-center gap-4"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)" }}
        >
          {/* Avatar with gradient ring */}
          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)", border: "2.5px solid #2563EB22" }}
            >
              <User size={24} className="text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-green-500 rounded-full border-2 border-card w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15.5px] font-bold text-foreground">Bapak Budi</p>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">Homestay Pagi Sore, Aceh</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                UMKM Aktif
              </span>
              <button className="text-[11.5px] text-primary font-bold hover:underline">
                Edit Profil →
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Layanan", value: "4" },
            { label: "Saran AI", value: "12" },
            { label: "Disetujui", value: "9" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-2xl px-3 py-3 text-center border border-border">
              <p className="text-[17px] font-bold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Settings Group */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {[
            { icon: Package, label: "Profil Usaha", toggle: false },
            { icon: Bell, label: "Notifikasi Rekomendasi AI", toggle: true },
            { icon: HelpCircle, label: "Bantuan & Tutorial", toggle: false },
            { icon: FileText, label: "Syarat & Ketentuan", toggle: false },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            const isLast = i === arr.length - 1;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3.5 px-4 min-h-[54px] ${!isLast ? "border-b border-border" : ""}`}
              >
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <span className="flex-1 text-[14.5px] font-medium text-foreground">{item.label}</span>
                {item.toggle ? (
                  <button
                    onClick={() => setNotifOn(!notifOn)}
                    role="switch"
                    aria-checked={notifOn}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifOn ? "bg-primary" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifOn ? "translate-x-5.5" : "translate-x-0.5"}`}
                      style={{ transform: notifOn ? "translateX(1.35rem)" : "translateX(0.125rem)" }}
                    />
                  </button>
                ) : (
                  <button className="hover:bg-muted rounded-lg p-1.5 transition-colors -mr-1">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50/70 transition-colors min-h-[54px] group">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut size={15} className="text-red-500" />
            </div>
            <span className="text-[14.5px] font-semibold text-red-500">Keluar (Logout)</span>
          </button>
        </div>

        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("saran");
  const [prevTab, setPrevTab] = useState<Tab>("saran");

  const handleNavigate = (t: Tab) => {
    setPrevTab(activeTab);
    setActiveTab(t);
  };

  const showBottomNav = activeTab !== "input";

  const screens: Record<Tab, React.ReactNode> = {
    saran:   <SaranAI onNavigate={handleNavigate} />,
    katalog: <Katalog onNavigate={handleNavigate} />,
    input:   <InputHPP onNavigate={handleNavigate} />,
    akun:    <Akun onNavigate={handleNavigate} />,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(145deg, #CBD5E1 0%, #94A3B8 100%)" }}
    >
      {/* Device frame */}
      <div
        className="relative flex flex-col"
        style={{
          width: "360px",
          height: "780px",
          borderRadius: "2rem",
          background: "#1E293B",
          padding: "3px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* Screen area */}
        <div
          className="flex flex-col overflow-hidden flex-1"
          style={{ borderRadius: "1.75rem", background: "#F8FAFC" }}
        >
          {/* Android Chrome browser bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{ background: "#3C4043" }}
          >
            {/* Tab indicator */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="text-[10px] text-slate-300 font-medium bg-slate-600 px-1.5 py-0.5 rounded">1</div>
            </div>
            {/* URL bar */}
            <div
              className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] text-slate-300"
              style={{ background: "#5F6368" }}
            >
              <div className="w-2.5 h-2.5 rounded-full border border-green-400 flex items-center justify-center flex-shrink-0">
                <div className="w-1 h-1 rounded-full bg-green-400" />
              </div>
              <span className="font-medium truncate">smartpricing.id</span>
            </div>
            {/* Menu dots */}
            <div className="flex flex-col gap-[3px] flex-shrink-0 px-1">
              {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-400" />)}
            </div>
          </div>

          {/* Screen content */}
          <div
            key={activeTab}
            className="flex flex-col flex-1 min-h-0"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            {screens[activeTab]}
          </div>

          {/* Bottom nav — inside screen, outside scroll */}
          {showBottomNav && (
            <BottomNav active={activeTab} onChange={handleNavigate} />
          )}
        </div>
      </div>
    </div>
  );
}
