import { useState, useEffect, useRef } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Info,
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
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  fetchServices,
  fetchCurrentRecommendation,
  fetchPendingRecommendations,
  respondToRecommendation,
  updateServiceHpp,
  createService,
  deleteService,
  fetchMerchant,
  fetchMerchantStats,
  updateMerchant,
  login,
  register,
  deleteAccount,
  setAuthToken,
  getAuthToken,
  type Service,
  type Recommendation,
  type PendingRecommendation,
  type Merchant,
  type MerchantStats,
} from "./lib/api";
import termsRaw from "../../syaratketentuan.md?raw";

type Tab = "saran" | "katalog" | "input" | "akun";

function formatRupiah(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

// Abbreviated form ("150rb", "1.2jt") for tight single-row layouts where two
// full "Rp 150.000"-style values plus a label can overflow the 360px mobile frame.
function formatRupiahCompact(n: number): string {
  const rounded = Math.round(n);
  if (rounded >= 1_000_000) {
    const jt = rounded / 1_000_000;
    return `${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`;
  }
  if (rounded >= 1_000) {
    return `${Math.round(rounded / 1_000)}rb`;
  }
  return String(rounded);
}

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

// ─── Cold-start loading (Render free tier sleeps after 15min idle, ~30-60s
// to wake -- CLAUDE.md Stage K). Shown only on the very first load after the
// app mounts, not on every subsequent refetch, so it doesn't flash on top of
// routine loading spinners elsewhere in the app. ────────────────────────────
function ColdStartScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 min-h-screen">
      <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center animate-pulse">
        <Sparkles size={22} className="text-white" />
      </div>
      <p className="text-[14px] font-semibold text-foreground">Menyiapkan sistem...</p>
      <p className="text-[12.5px] text-muted-foreground max-w-[260px]">
        Server sedang aktif kembali setelah tidak digunakan. Proses ini bisa memakan waktu
        hingga 1 menit pada percobaan pertama.
      </p>
    </div>
  );
}

// ─── Shared empty/error states ───────────────────────────────────────────────
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
      <Package size={32} className="text-muted-foreground opacity-40 mb-1" />
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      <p className="text-[12.5px] text-muted-foreground">{description}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
      <X size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-[12.5px] text-red-700 leading-snug">{message}</p>
    </div>
  );
}

function FetchErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
      <X size={32} className="text-red-400 opacity-70 mb-1" />
      <p className="text-[14px] font-semibold text-foreground">Layanan belum tersedia</p>
      <p className="text-[12.5px] text-muted-foreground">Tidak dapat terhubung ke server. Coba lagi dalam beberapa saat.</p>
      <button
        onClick={onRetry}
        className="mt-1 bg-primary text-white text-[13px] font-bold rounded-xl px-4 py-2.5 hover:bg-blue-700 active:scale-95 transition-all"
      >
        Coba Lagi
      </button>
    </div>
  );
}

// ─── Add Service modal (Katalog's "Tambah") ─────────────────────────────────
function AddServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [listedPrice, setListedPrice] = useState("");
  const [hpp, setHpp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listedPriceNum = parseInt(listedPrice.replace(/\./g, ""), 10) || 0;
  const hppNum = parseInt(hpp.replace(/\./g, ""), 10) || 0;
  const canSave = name.trim().length > 0 && listedPriceNum > 0 && hppNum > 0 && !saving;

  const handleSubmit = () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    createService({
      name: name.trim(),
      listed_price: listedPriceNum,
      hpp: hppNum,
    })
      .then(() => {
        onCreated();
        onClose();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-[380px] p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-foreground">Tambah Layanan</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Tutup"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Nama Layanan
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Sewa Motor"
            className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Harga Normal
          </label>
          <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <span className="px-3 py-2.5 text-[13px] font-bold text-muted-foreground border-r border-border bg-muted/50">Rp</span>
            <input
              value={listedPrice}
              onChange={(e) => setListedPrice(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="flex-1 px-3.5 py-2.5 text-[14px] text-foreground bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            HPP (Harga Pokok)
          </label>
          <div className="flex items-center border border-amber-300 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <span className="px-3 py-2.5 text-[13px] font-bold text-amber-700 border-r border-amber-200 bg-amber-50">Rp</span>
            <input
              value={hpp}
              onChange={(e) => setHpp(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="flex-1 px-3.5 py-2.5 text-[14px] text-foreground bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="w-full bg-primary text-white font-bold rounded-xl py-3 text-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Layanan"}
        </button>
      </div>
    </div>
  );
}

// ─── Screen 1: Saran AI ──────────────────────────────────────────────────────
function SaranAI({
  services,
  servicesError,
  onRetryServices,
  notifOn,
}: {
  services: Service[];
  servicesError: string | null;
  onRetryServices: () => void;
  notifOn: boolean;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alasanOpen, setAlasanOpen] = useState(false);
  const [decision, setDecision] = useState<"setuju" | "tolak" | null>(null);
  const [responding, setResponding] = useState(false);
  const [pendingList, setPendingList] = useState<PendingRecommendation[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const loadPending = () => {
    fetchPendingRecommendations().then(setPendingList).catch(() => {});
  };

  useEffect(() => { loadPending(); }, []);

  useEffect(() => {
    if (services.length > 0 && selectedServiceId === null) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const loadRecommendation = (serviceId: number) => {
    setLoading(true);
    setError(null);
    fetchCurrentRecommendation(serviceId)
      .then((rec) => {
        setRecommendation(rec);
        loadPending();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedServiceId !== null) {
      setDecision(null);
      loadRecommendation(selectedServiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  const handleRespond = (status: "approved" | "rejected") => {
    if (!recommendation) return;
    setResponding(true);
    respondToRecommendation(recommendation.id, status)
      .then(() => {
        setDecision(status === "approved" ? "setuju" : "tolak");
        loadPending();
        setTimeout(() => {
          if (selectedServiceId !== null) loadRecommendation(selectedServiceId);
        }, 2000);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setResponding(false));
  };

  if (services.length === 0) {
    return (
      <Screen>
        {servicesError ? (
          <FetchErrorState onRetry={onRetryServices} />
        ) : (
          <EmptyState
            title="Belum ada layanan"
            description="Tambahkan layanan di Katalog terlebih dahulu untuk mendapatkan rekomendasi AI."
          />
        )}
      </Screen>
    );
  }

  const hargaAsli = selectedService ? Number(selectedService.listed_price) : 0;
  const hargaSaran = recommendation ? Number(recommendation.suggested_price) : 0;
  const hppVal = selectedService ? Number(selectedService.hpp) : 0;
  const discountPct = hargaAsli > 0 ? Math.round(((hargaAsli - hargaSaran) / hargaAsli) * 100) : 0;
  const marginPct = hppVal > 0 ? Math.round(((hargaSaran - hppVal) / hppVal) * 100) : 0;
  const barPct = hargaSaran > 0 ? Math.round(((hargaSaran - hppVal) / hargaSaran) * 100) : 0;

  let judul = "";
  if (recommendation) {
    if (hargaSaran < hargaAsli) {
      judul = `Saran AI: Turunkan harga ${selectedService?.name} menjadi Rp ${formatRupiah(hargaSaran)} (diskon ${discountPct}%)`;
    } else if (hargaSaran > hargaAsli) {
      judul = `Saran AI: Harga ${selectedService?.name} disesuaikan ke Rp ${formatRupiah(hargaSaran)} agar tetap di atas HPP`;
    } else {
      judul = `Saran AI: Pertahankan harga ${selectedService?.name} di Rp ${formatRupiah(hargaSaran)}`;
    }
  }

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
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel((v) => !v)}
            className="relative w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Notifikasi"
          >
            <Bell size={19} className="text-foreground" />
            {notifOn && pendingList.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card" />
            )}
          </button>

          {showNotifPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
              <div
                className="absolute right-0 top-11 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[13px] font-bold text-foreground">Rekomendasi Menunggu</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {pendingList.length === 0 ? (
                    <p className="text-[12.5px] text-muted-foreground text-center py-6">
                      Tidak ada rekomendasi baru.
                    </p>
                  ) : (
                    pendingList.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedServiceId(item.service_id);
                          setShowNotifPanel(false);
                        }}
                        className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-[12.5px] font-bold text-foreground">{item.service_name}</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2">
                          Rp {formatRupiah(Number(item.suggested_price))} — {item.rationale_text}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Service Dropdown */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Pilih Layanan</p>
          <div className="relative">
            <select
              value={selectedServiceId ?? ""}
              onChange={(e) => setSelectedServiceId(Number(e.target.value))}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-foreground appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-10"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Rp{formatRupiah(Number(s.listed_price))})
                </option>
              ))}
            </select>
            <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {loading && (
          <p className="text-[13px] text-muted-foreground text-center py-6">Memuat rekomendasi...</p>
        )}

        {!loading && recommendation && selectedService && (
          <>
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
              <div className="flex">
                <div className="w-1 bg-primary flex-shrink-0" style={{ background: "linear-gradient(to bottom, #2563EB, #1E40AF)" }} />
                <div className="flex-1 p-4" style={{ background: "linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 60%)" }}>
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-2.5 py-1 mb-3">
                    <BrainCircuit size={11} className="text-primary" />
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Rekomendasi AI</span>
                  </div>

                  <p className="text-[15.5px] font-bold text-foreground leading-[1.45] mb-3">{judul}</p>

                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-3">
                    <CheckCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-green-800 leading-snug">
                      <span className="font-bold">Aman:</span> Harga rekomendasi (Rp {formatRupiah(hargaSaran)}) tetap di atas HPP (Rp {formatRupiah(hppVal)}).
                    </p>
                  </div>

                  <div className="mb-4 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground font-medium">HPP (Rp {formatRupiahCompact(hppVal)})</span>
                      <span className="text-[11px] font-bold text-green-700">Margin {marginPct}%</span>
                      <span className="text-[11px] text-muted-foreground font-medium">Harga saran (Rp {formatRupiahCompact(hargaSaran)})</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500"
                        style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {decision === null ? (
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleRespond("approved")}
                        disabled={responding}
                        className="flex-1 bg-primary text-white font-bold rounded-xl py-3 text-[14.5px] hover:bg-blue-700 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 min-h-[48px] shadow-sm disabled:opacity-60"
                      >
                        <Check size={16} />
                        Setuju
                      </button>
                      <button
                        onClick={() => handleRespond("rejected")}
                        disabled={responding}
                        className="flex-1 border-2 border-slate-200 text-slate-500 font-bold rounded-xl py-3 text-[14.5px] hover:bg-slate-50 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 min-h-[48px] disabled:opacity-60"
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
                            <p className="text-green-800 font-bold text-[13px]">Rekomendasi disetujui!</p>
                            <p className="text-green-600 text-[11px]">Memuat rekomendasi berikutnya...</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <X size={14} className="text-red-500" />
                          </div>
                          <div>
                            <p className="text-red-700 font-bold text-[13px]">Rekomendasi ditolak.</p>
                            <p className="text-red-400 text-[11px]">Memuat rekomendasi berikutnya...</p>
                          </div>
                        </>
                      )}
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
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Info size={13} className="text-blue-600" />
                    </div>
                    <p className="text-[13px] text-foreground leading-snug">{recommendation.rationale_text}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Screen 2: Katalog ───────────────────────────────────────────────────────
function Katalog({
  services,
  loading,
  error,
  onRetry,
  onEditHpp,
}: {
  services: Service[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEditHpp: (serviceId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = (service: Service) => {
    if (!window.confirm(`Hapus layanan "${service.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    setDeletingId(service.id);
    setDeleteError(null);
    deleteService(service.id)
      .then(onRetry)
      .catch((err: Error) => setDeleteError(err.message))
      .finally(() => setDeletingId(null));
  };

  return (
    <Screen>
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-[16px] font-bold text-foreground">Katalog Layanan</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white text-[12.5px] font-bold rounded-xl px-3 py-2 flex items-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all min-h-[36px] shadow-sm"
        >
          <Plus size={14} />
          Tambah
        </button>
      </header>

      {showAddModal && (
        <AddServiceModal onClose={() => setShowAddModal(false)} onCreated={onRetry} />
      )}

      {error && services.length === 0 && !loading ? (
        <FetchErrorState onRetry={onRetry} />
      ) : (
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3">
        {error && <ErrorBanner message={error} />}
        {deleteError && <ErrorBanner message={deleteError} />}

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

        {loading ? (
          <p className="text-[13px] text-muted-foreground text-center py-10">Memuat layanan...</p>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-muted-foreground px-0.5">
              {filtered.length} layanan tersedia
            </p>

            <div className="space-y-3">
              {filtered.map((s) => {
                const hargaNum = Number(s.listed_price);
                const hppNum = Number(s.hpp);
                const marginPct = hppNum > 0 ? Math.round(((hargaNum - hppNum) / hppNum) * 100) : 0;
                return (
                  <div
                    key={s.id}
                    className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3.5"
                    style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Package size={18} className="text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] font-bold text-foreground leading-tight">{s.name}</p>
                      <p className="text-[13px] text-foreground font-semibold mt-0.5">Rp {formatRupiah(hargaNum)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => onEditHpp(s.id)}
                          className="text-[11px] text-primary font-bold hover:underline"
                        >
                          Lihat HPP
                        </button>
                        <span className="text-[11px] text-green-700 font-semibold bg-green-50 px-1.5 py-0.5 rounded-md">
                          Margin {marginPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onEditHpp(s.id)}
                        className="border border-slate-200 text-slate-500 text-[12.5px] font-semibold rounded-xl px-3 py-2 hover:bg-muted active:scale-95 transition-all flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        aria-label={`Hapus ${s.name}`}
                        className="border border-red-200 text-red-500 text-[12.5px] font-semibold rounded-xl px-3 py-2 hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[38px] disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        {deletingId === s.id ? "..." : "Hapus"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-10">
                  <Search size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-muted-foreground text-[14px]">
                    {services.length === 0 ? "Belum ada layanan." : "Tidak ada layanan ditemukan."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        <div className="h-2" />
      </div>
      )}
    </Screen>
  );
}

// ─── Screen 3: Input HPP ─────────────────────────────────────────────────────
function InputHPP({
  services,
  servicesError,
  onRetryServices,
  onSaved,
  onNavigate,
  focusServiceId,
}: {
  services: Service[];
  servicesError: string | null;
  onRetryServices: () => void;
  onSaved: () => void;
  onNavigate: (t: Tab) => void;
  focusServiceId: number | null;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [hpp, setHpp] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (services.length > 0 && selectedServiceId === null) {
      const wanted = focusServiceId !== null && services.some((s) => s.id === focusServiceId);
      setSelectedServiceId(wanted ? focusServiceId : services[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, selectedServiceId]);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  useEffect(() => {
    if (selectedService) {
      setHpp(formatRupiah(Number(selectedService.hpp)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, selectedService?.hpp]);

  const hargaNum = selectedService ? Number(selectedService.listed_price) : 0;
  const hppNum = parseInt(hpp.replace(/\./g, ""), 10) || 0;
  const marginPct = hargaNum > 0 && hppNum > 0 ? Math.round(((hargaNum - hppNum) / hargaNum) * 100) : 0;
  const isSafe = hppNum < hargaNum;

  const handleSave = () => {
    if (!selectedService || hppNum <= 0 || saving) return;
    setSaving(true);
    setError(null);
    updateServiceHpp(selectedService.id, hppNum)
      .then(() => {
        setSaved(true);
        onSaved();
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const noServices = services.length === 0;

  return (
    <Screen>
      {/* Header — always rendered, even when empty/erroring, since this screen hides the
          bottom nav and relies on this back button as the only way out. */}
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
          disabled={saving || noServices}
          className="w-10 h-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-60"
          aria-label="Simpan"
        >
          <Save size={19} className={saved ? "text-green-600" : "text-foreground"} />
        </button>
      </header>

      {noServices ? (
        servicesError ? (
          <FetchErrorState onRetry={onRetryServices} />
        ) : (
          <EmptyState
            title="Belum ada layanan"
            description="Tambahkan layanan di Katalog terlebih dahulu untuk mengatur HPP."
          />
        )
      ) : (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {error && <ErrorBanner message={error} />}

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
              value={selectedServiceId ?? ""}
              onChange={(e) => setSelectedServiceId(Number(e.target.value))}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-[14.5px] font-semibold text-foreground appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-10"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Harga Normal — read-only, no PUT endpoint for listed_price yet */}
        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Harga Normal Saat Ini
          </label>
          <div className="flex items-center bg-muted/50 border border-border rounded-2xl overflow-hidden">
            <span className="px-4 py-3.5 text-[14px] font-bold text-muted-foreground border-r border-border bg-muted/50 min-w-[52px] text-center flex-shrink-0">
              Rp
            </span>
            <input
              value={formatRupiah(hargaNum)}
              readOnly
              disabled
              className="flex-1 px-4 py-3.5 text-[15px] font-semibold text-foreground bg-transparent focus:outline-none"
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
          disabled={saving}
          className={`w-full font-bold rounded-2xl py-4 text-[15.5px] transition-all flex items-center justify-center gap-2 min-h-[54px] active:scale-[0.98] shadow-sm disabled:opacity-60 ${
            saved
              ? "bg-green-600 text-white"
              : "bg-primary text-white hover:bg-blue-700"
          }`}
          style={!saved ? { boxShadow: "0 4px 14px rgba(37,99,235,0.35)" } : {}}
        >
          {saved ? (
            <><Check size={18} />Data Tersimpan!</>
          ) : (
            <><Save size={18} />{saving ? "Menyimpan..." : "Simpan Data HPP"}</>
          )}
        </button>

        <div className="h-2" />
      </div>
      )}
    </Screen>
  );
}

// ─── Shared sub-screen header (Bantuan/Syarat back navigation) ──────────────
function SubScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="bg-card border-b border-border px-2 py-2.5 flex items-center gap-1 flex-shrink-0">
      <button
        onClick={onBack}
        className="w-10 h-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center flex-shrink-0"
        aria-label="Kembali"
      >
        <ArrowLeft size={19} className="text-foreground" />
      </button>
      <h1 className="flex-1 text-[15px] font-bold text-foreground text-center pr-10">{title}</h1>
    </header>
  );
}

// ─── Bantuan & Tutorial ──────────────────────────────────────────────────────
function HelpScreen({ onBack }: { onBack: () => void }) {
  const faqs = [
    {
      q: "Bagaimana cara kerja Saran AI?",
      a: "AI membaca cuaca, kalender lokal, dan keramaian lokasi untuk menyarankan diskon atau bundling. Setiap saran disertai alasan (\"Alasan Algoritma\") dan tidak pernah diterapkan otomatis — Anda selalu memutuskan lewat tombol Setuju/Tolak.",
    },
    {
      q: "Apa itu HPP dan kenapa penting?",
      a: "HPP (Harga Pokok Penjualan) adalah biaya modal layanan Anda. AI tidak akan pernah menyarankan harga di bawah HPP yang Anda masukkan di halaman Input HPP — ini batas aman yang dijaga oleh sistem, bukan sekadar peringatan.",
    },
    {
      q: "Bagaimana cara menambah atau menghapus layanan?",
      a: "Buka Katalog, ketuk \"Tambah\" untuk layanan baru, atau \"Hapus\" pada kartu layanan untuk menghapusnya dari daftar. Riwayat rekomendasi layanan yang dihapus tetap tersimpan untuk catatan Anda.",
    },
    {
      q: "Apa yang terjadi setelah saya menekan Setuju atau Tolak?",
      a: "Keputusan Anda dicatat dengan waktu dan alasan yang ditampilkan saat itu, lalu sistem menyiapkan rekomendasi berikutnya berdasarkan kondisi terbaru.",
    },
  ];

  return (
    <Screen>
      <SubScreenHeader title="Bantuan & Tutorial" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {faqs.map((item) => (
          <div key={item.q} className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm">
            <p className="text-[13.5px] font-bold text-foreground mb-1.5">{item.q}</p>
            <p className="text-[13px] text-muted-foreground leading-snug">{item.a}</p>
          </div>
        ))}
        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Syarat & Ketentuan ──────────────────────────────────────────────────────
// Extracts numbered "## " sections from syaratketentuan.md, skipping the top
// meta-commentary block and the trailing "*[...]*" editorial note -- both are
// notes to the developer (drafting context, "fill in contact info before
// launch"), never meant to render as merchant-facing terms text.
function parseTermsSections(markdown: string): { title: string; body: string[] }[] {
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const rawLine of markdown.split("\n")) {
    if (rawLine.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: rawLine.slice(3).trim(), body: [] };
    } else if (current && rawLine.trim() !== "---" && !rawLine.trim().startsWith("*[")) {
      current.body.push(rawLine);
    }
  }
  if (current) sections.push(current);
  return sections;
}

type TermsBlock = { type: "p" | "ul"; items: string[] };

function renderTermsBody(lines: string[]): TermsBlock[] {
  const blocks: TermsBlock[] = [];
  let mode: "none" | "p" | "ul" = "none";
  let paraBuf: string[] = [];
  let listItems: string[] = [];

  const flush = () => {
    if (mode === "p" && paraBuf.length > 0) blocks.push({ type: "p", items: [paraBuf.join(" ")] });
    if (mode === "ul" && listItems.length > 0) blocks.push({ type: "ul", items: listItems });
    paraBuf = [];
    listItems = [];
    mode = "none";
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
    } else if (line.startsWith("- ")) {
      if (mode !== "ul") { flush(); mode = "ul"; }
      listItems.push(line.slice(2).trim());
    } else if (mode === "ul") {
      // wrapped continuation of the previous list item
      listItems[listItems.length - 1] += ` ${line}`;
    } else {
      if (mode !== "p") { flush(); mode = "p"; }
      paraBuf.push(line);
    }
  }
  flush();
  return blocks;
}

const TERMS_SECTIONS = parseTermsSections(termsRaw);

function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <SubScreenHeader title="Syarat & Ketentuan" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-amber-800 leading-snug">
            <span className="font-bold">Draf sementara.</span> Teks ini belum ditinjau secara hukum dan akan
            diperbarui sebelum peluncuran resmi.
          </p>
        </div>
        {TERMS_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm space-y-2.5"
          >
            <p className="text-[13.5px] font-bold text-foreground">{section.title}</p>
            {renderTermsBody(section.body).map((block, i) =>
              block.type === "ul" ? (
                <ul key={i} className="list-disc pl-4 space-y-1.5">
                  {block.items.map((item, j) => (
                    <li key={j} className="text-[13px] text-foreground leading-snug">{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="text-[13px] text-foreground leading-snug">{block.items[0]}</p>
              )
            )}
          </div>
        ))}
        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Edit Profil / Profil Usaha modal ────────────────────────────────────────
function EditProfileModal({
  merchant,
  onClose,
  onSaved,
}: {
  merchant: Merchant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(merchant.name);
  const [businessName, setBusinessName] = useState(merchant.business_name);
  const [location, setLocation] = useState(merchant.location);
  const [mapsLink, setMapsLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    name.trim().length > 0 && businessName.trim().length > 0 && location.trim().length > 0 && !saving;

  const handleSubmit = () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    updateMerchant({
      name: name.trim(),
      business_name: businessName.trim(),
      location: location.trim(),
      maps_link: mapsLink.trim() || undefined,
    })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-[380px] p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-foreground">Edit Profil</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Tutup"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Nama Pemilik
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Nama Usaha
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Lokasi
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Tempel Link Google Maps
          </label>
          <input
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-snug">
            Buka lokasi usaha Anda di Google Maps, ketuk tombol Bagikan, lalu tempel link-nya di
            sini. Ini cara paling akurat agar Saran AI menghitung cuaca dan keramaian dari lokasi
            usaha Anda yang sebenarnya.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="w-full bg-primary text-white font-bold rounded-xl py-3 text-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: Akun ──────────────────────────────────────────────────────────
function Akun({
  onNavigate,
  notifOn,
  setNotifOn,
  onLogout,
}: {
  onNavigate: (t: Tab) => void;
  notifOn: boolean;
  setNotifOn: (v: boolean) => void;
  onLogout: () => void;
}) {
  const [view, setView] = useState<"profile" | "help" | "terms">("profile");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = () => {
    if (!window.confirm("Yakin ingin menghapus akun? Anda tidak akan bisa masuk lagi setelah ini.")) {
      return;
    }
    setDeletingAccount(true);
    deleteAccount()
      .then(onLogout)
      .catch((err: Error) => setMerchantError(err.message))
      .finally(() => setDeletingAccount(false));
  };

  const loadMerchant = () => {
    setMerchantError(null);
    fetchMerchant()
      .then(setMerchant)
      .catch((err: Error) => setMerchantError(err.message));
  };

  // Secondary, non-blocking -- a stats-fetch failure shouldn't take down the
  // whole Akun screen the way a merchant-profile failure should.
  const loadStats = () => {
    fetchMerchantStats().then(setStats).catch(() => {});
  };

  useEffect(() => { loadMerchant(); loadStats(); }, []);

  if (view === "help") return <HelpScreen onBack={() => setView("profile")} />;
  if (view === "terms") return <TermsScreen onBack={() => setView("profile")} />;

  return (
    <Screen>
      <header className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
        <h1 className="text-[16px] font-bold text-foreground">Akun Saya</h1>
      </header>

      {showEditModal && merchant && (
        <EditProfileModal
          merchant={merchant}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { loadMerchant(); loadStats(); }}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {merchantError && <ErrorBanner message={merchantError} />}

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
            <p className="text-[15.5px] font-bold text-foreground">{merchant?.name ?? "Memuat..."}</p>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {merchant ? `${merchant.business_name}, ${merchant.location}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                UMKM Aktif
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                disabled={!merchant}
                className="text-[11.5px] text-primary font-bold hover:underline disabled:opacity-50"
              >
                Edit Profil →
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Layanan", value: stats ? String(stats.services_count) : "-" },
            { label: "Saran AI", value: stats ? String(stats.recommendations_count) : "-" },
            { label: "Disetujui", value: stats ? String(stats.approved_count) : "-" },
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
            { icon: Package, label: "Profil Usaha", toggle: false, onClick: () => setShowEditModal(true) },
            { icon: Bell, label: "Notifikasi Rekomendasi AI", toggle: true, onClick: undefined },
            { icon: HelpCircle, label: "Bantuan & Tutorial", toggle: false, onClick: () => setView("help") },
            { icon: FileText, label: "Syarat & Ketentuan", toggle: false, onClick: () => setView("terms") },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            const isLast = i === arr.length - 1;
            const Row = item.toggle ? "div" : "button";
            return (
              <Row
                key={item.label}
                onClick={item.toggle ? undefined : item.onClick}
                className={`w-full flex items-center gap-3.5 px-4 min-h-[54px] text-left ${!item.toggle ? "hover:bg-muted/40 transition-colors" : ""} ${!isLast ? "border-b border-border" : ""}`}
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
                  <span className="rounded-lg p-1.5 -mr-1">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </span>
                )}
              </Row>
            );
          })}
        </div>

        {/* Logout */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50/70 transition-colors min-h-[54px] group"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut size={15} className="text-red-500" />
            </div>
            <span className="text-[14.5px] font-semibold text-red-500">Keluar (Logout)</span>
          </button>
        </div>

        {/* Delete account */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50/70 transition-colors min-h-[54px] group disabled:opacity-60"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Trash2 size={15} className="text-red-500" />
            </div>
            <span className="text-[14.5px] font-semibold text-red-500">
              {deletingAccount ? "Menghapus..." : "Hapus Akun"}
            </span>
          </button>
        </div>

        <div className="h-2" />
      </div>
    </Screen>
  );
}

// ─── Auth (Masuk / Daftar) ───────────────────────────────────────────────────
function AuthScreen({ onAuthed }: { onAuthed: (token: string, merchant: Merchant) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    (mode === "login" || (name.trim().length > 0 && businessName.trim().length > 0 && location.trim().length > 0)) &&
    !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const call =
      mode === "login"
        ? login(email.trim(), password)
        : register({
            email: email.trim(),
            password,
            name: name.trim(),
            business_name: businessName.trim(),
            location: location.trim(),
          });
    call
      .then((result) => onAuthed(result.access_token, result.merchant))
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <Screen>
      <div className="flex-1 overflow-y-auto px-5 py-8 space-y-5">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>
          <span className="text-[17px] font-bold text-foreground tracking-tight">SmartPricing XAI</span>
        </div>

        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-[13.5px] font-bold transition-colors ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Masuk
          </button>
          <button
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-[13.5px] font-bold transition-colors ${mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Daftar
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="space-y-3.5">
          <div>
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="nama@email.com"
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Kata Sandi
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Minimal 8 karakter"
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Nama Pemilik
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Nama Usaha
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Lokasi
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-primary text-white font-bold rounded-xl py-3.5 text-[14.5px] hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
        </button>
        {submitting && (
          <p className="text-[11.5px] text-muted-foreground text-center -mt-2">
            Bisa memakan waktu hingga 1 menit jika server baru aktif kembali.
          </p>
        )}
      </div>
    </Screen>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [authToken, setAuthTokenState] = useState<string | null>(() => getAuthToken());
  const [activeTab, setActiveTab] = useState<Tab>("saran");
  const [prevTab, setPrevTab] = useState<Tab>("saran");

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [hppFocusServiceId, setHppFocusServiceId] = useState<number | null>(null);
  const [notifOn, setNotifOn] = useState(true);
  // Ref, not state: flips once the first loadServices() call completes and
  // must never trigger a re-render itself -- only servicesLoading does that.
  const hasLoadedOnce = useRef(false);

  const loadServices = () => {
    setServicesLoading(true);
    setServicesError(null);
    fetchServices()
      .then(setServices)
      .catch((err: Error) => setServicesError(err.message))
      .finally(() => {
        setServicesLoading(false);
        hasLoadedOnce.current = true;
      });
  };

  useEffect(() => {
    if (authToken) loadServices();
  }, [authToken]);

  const handleAuthed = (token: string, _merchant: Merchant) => {
    setAuthToken(token);
    setAuthTokenState(token);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthTokenState(null);
    setServices([]);
    setActiveTab("saran");
  };

  const handleNavigate = (t: Tab) => {
    setPrevTab(activeTab);
    setActiveTab(t);
  };

  const handleEditHpp = (serviceId: number) => {
    setHppFocusServiceId(serviceId);
    handleNavigate("input");
  };

  if (!authToken) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  // Only the very first load ever shows the cold-start explainer -- every
  // later reload (a retry button, editing HPP, etc.) falls through to the
  // existing per-screen loading/error states instead.
  if (servicesLoading && !hasLoadedOnce.current) {
    return <ColdStartScreen />;
  }

  const showBottomNav = activeTab !== "input";

  const screens: Record<Tab, React.ReactNode> = {
    saran:   <SaranAI services={services} servicesError={servicesError} onRetryServices={loadServices} notifOn={notifOn} />,
    katalog: <Katalog services={services} loading={servicesLoading} error={servicesError} onRetry={loadServices} onEditHpp={handleEditHpp} />,
    input:   <InputHPP services={services} servicesError={servicesError} onRetryServices={loadServices} onSaved={loadServices} onNavigate={handleNavigate} focusServiceId={hppFocusServiceId} />,
    akun:    <Akun onNavigate={handleNavigate} notifOn={notifOn} setNotifOn={setNotifOn} onLogout={handleLogout} />,
  };

  // The real app IS a plain responsive page — the user's own mobile browser is the
  // frame. No fake device bezel / fake browser chrome on top of it.
  return (
    <div
      key={activeTab}
      className="min-h-screen w-full max-w-[420px] mx-auto flex flex-col bg-background"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {screens[activeTab]}
      {showBottomNav && (
        <BottomNav active={activeTab} onChange={handleNavigate} />
      )}
    </div>
  );
}
