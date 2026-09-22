import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_OLLAMA_URL,
  fetchOllamaProcesses,
  fetchOllamaTags,
  pullOllamaModel,
  type OllamaProcess,
  type OllamaTag,
} from "@/lib/ollama";
import {
  ArrowDownToLine,
  ArrowUpLeft,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  Cpu,
  Download,
  FolderGit2,
  HardDrive,
  Info,
  LayoutDashboard,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SquareTerminal,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Category = "الكل" | "نص" | "صور" | "صوت";

type Model = {
  id: string;
  ollamaName?: string;
  name: string;
  family: string;
  description: string;
  category: Exclude<Category, "الكل">;
  size: string;
  params: string;
  updated: string;
  color: string;
  icon: string;
  downloads: string;
  license: string;
  context: string;
};

const models: Model[] = [
  {
    id: "qwen-2-5",
    ollamaName: "qwen2.5:7b",
    name: "Qwen 2.5 7B",
    family: "Qwen / Alibaba",
    description: "نموذج لغوي سريع ومتعدد اللغات، مثالي للمحادثة والبرمجة على الأجهزة الشخصية.",
    category: "نص",
    size: "4.7 GB",
    params: "7B parameters",
    updated: "منذ 3 أيام",
    color: "from-amber-300/25 via-orange-500/10 to-transparent",
    icon: "Q",
    downloads: "18.4K",
    license: "Apache 2.0",
    context: "32K tokens",
  },
  {
    id: "llama-3-2",
    ollamaName: "llama3.2:3b",
    name: "Llama 3.2 3B",
    family: "Meta AI",
    description: "خفيف وفعال للمهام اليومية. بداية ممتازة لتشغيل الذكاء الاصطناعي دون اتصال.",
    category: "نص",
    size: "2.0 GB",
    params: "3B parameters",
    updated: "منذ أسبوع",
    color: "from-violet-400/25 via-fuchsia-500/10 to-transparent",
    icon: "L",
    downloads: "24.8K",
    license: "Llama 3.2",
    context: "128K tokens",
  },
  {
    id: "mistral-7b",
    ollamaName: "mistral:7b",
    name: "Mistral 7B Instruct",
    family: "Mistral AI",
    description: "أداء قوي في التعليمات والاستدلال مع ذاكرة محلية صغيرة واستهلاك منخفض.",
    category: "نص",
    size: "4.1 GB",
    params: "7B parameters",
    updated: "منذ أسبوعين",
    color: "from-cyan-300/25 via-blue-500/10 to-transparent",
    icon: "M",
    downloads: "12.2K",
    license: "Apache 2.0",
    context: "32K tokens",
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion XL",
    family: "Stability AI",
    description: "أنشئ صورًا عالية الجودة محليًا مع تحكم كامل في النماذج والإعدادات.",
    category: "صور",
    size: "6.8 GB",
    params: "3.5B parameters",
    updated: "منذ شهر",
    color: "from-pink-400/25 via-rose-500/10 to-transparent",
    icon: "S",
    downloads: "31.6K",
    license: "OpenRAIL++",
    context: "1024 × 1024",
  },
  {
    id: "whisper-large",
    name: "Whisper Large V3",
    family: "OpenAI",
    description: "تحويل الكلام إلى نص بدقة عالية مع دعم واسع للهجات واللغات العربية.",
    category: "صوت",
    size: "3.1 GB",
    params: "1.5B parameters",
    updated: "منذ شهرين",
    color: "from-emerald-300/25 via-teal-500/10 to-transparent",
    icon: "W",
    downloads: "9.7K",
    license: "MIT",
    context: "99 لغة",
  },
];

const navItems = [
  { label: "نظرة عامة", icon: LayoutDashboard },
  { label: "مكتبة النماذج", icon: Boxes },
  { label: "بيئة التشغيل", icon: Cpu },
  { label: "مساحة العمل", icon: FolderGit2 },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("نظرة عامة");
  const [category, setCategory] = useState<Category>("الكل");
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [downloaded, setDownloaded] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [ollamaTags, setOllamaTags] = useState<OllamaTag[]>([]);
  const [runningModels, setRunningModels] = useState<OllamaProcess[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaError, setOllamaError] = useState("");
  const [ollamaUrl] = useState(() => localStorage.getItem("model-lab-ollama-url") || DEFAULT_OLLAMA_URL);
  const abortRef = useRef<AbortController | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const refreshOllama = async () => {
      try {
        const [tags, processes] = await Promise.all([
          fetchOllamaTags(ollamaUrl, controller.signal),
          fetchOllamaProcesses(ollamaUrl, controller.signal),
        ]);
        setOllamaTags(tags);
        setRunningModels(processes);
        setDownloaded(models.filter((model) => model.ollamaName && tags.some((tag) => tag.name === model.ollamaName || tag.model === model.ollamaName)).map((model) => model.id));
        setOllamaConnected(true);
        setOllamaError("");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setOllamaConnected(false);
        setOllamaError("تعذر الاتصال بـ Ollama — شغّله أو تحقّق من OLLAMA_ORIGINS");
      }
    };
    refreshOllama();
    const interval = window.setInterval(refreshOllama, 5000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [ollamaUrl]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesCategory = category === "الكل" || model.category === category;
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery = !normalizedQuery || `${model.name} ${model.family} ${model.description}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const localStorageBytes = ollamaTags.reduce((sum, tag) => sum + (tag.size ?? 0), 0);
  const localStorageLabel = localStorageBytes > 0 ? `${(localStorageBytes / 1024 / 1024 / 1024).toFixed(1)} GB` : "—";
  const runningNames = new Set(runningModels.map((model) => model.name));

  const startDownload = async (model: Model) => {
    if (!model.ollamaName) {
      toast.error("هذا النموذج غير مربوط بـ Ollama بعد");
      return;
    }
    if (downloaded.includes(model.id)) {
      toast.info("النموذج موجود على جهازك", { description: "يمكنك تشغيله أو تعديل إعداداته من مساحة العمل." });
      return;
    }
    if (!ollamaConnected) {
      toast.error("Ollama غير متصل", { description: "شغّل Ollama محليًا، وإذا فتحت المنصة من رابط بعيد أضف أصل الموقع إلى OLLAMA_ORIGINS ثم أعد تشغيل Ollama." });
      return;
    }
    if (downloadingId) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setDownloadingId(model.id);
    setDownloadProgress(0);
    setDownloadStatus("بدء الاتصال بـ Ollama...");
    toast.message(`جاري تنزيل ${model.name}`, { description: `سيتم حفظه محليًا عبر Ollama (${ollamaUrl})` });
    try {
      await pullOllamaModel(ollamaUrl, model.ollamaName, ({ status, progress }) => {
        setDownloadProgress(progress);
        setDownloadStatus(status);
      }, controller.signal);
      setDownloaded((items) => (items.includes(model.id) ? items : [...items, model.id]));
      toast.success("اكتمل تنزيل النموذج", { description: "تمت إضافته إلى مكتبة Ollama المحلية." });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("فشل تنزيل النموذج", { description: (error as Error).message || "تحقق من تشغيل Ollama." });
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      setDownloadStatus("");
      abortRef.current = null;
    }
  };

  const changeNav = (label: string) => {
    setActiveNav(label);
    if (label !== "نظرة عامة") {
      toast.message(label, { description: "هذه المساحة جاهزة للتوسعة في الإصدار التالي." });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#090b10] text-[#f4f5f7] selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="absolute -bottom-60 left-1/3 h-[480px] w-[480px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-row-reverse">
        <aside className="hidden w-[252px] shrink-0 border-l border-white/[0.07] bg-[#0c0f15]/80 px-5 py-6 md:flex md:flex-col">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-violet-400 via-indigo-500 to-cyan-400 shadow-[0_0_30px_rgba(124,92,255,.3)]">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-display text-[17px] font-bold tracking-tight text-white">Model Lab</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-slate-500">LOCAL AI STUDIO</div>
            </div>
          </div>

          <div className="mb-3 px-2 text-[10px] font-bold tracking-[0.18em] text-slate-600">مساحتك</div>
          <nav className="space-y-1.5">
            {navItems.map(({ label, icon: Icon }) => {
              const active = activeNav === label;
              return (
                <button
                  key={label}
                  onClick={() => changeNav(label)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-[13px] font-semibold transition-all duration-200 ${active ? "bg-violet-500/[0.14] text-violet-200 shadow-[inset_-2px_0_0_#8b5cf6]" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}
                >
                  <Icon className={`h-[17px] w-[17px] ${active ? "text-violet-300" : "text-slate-600 group-hover:text-slate-300"}`} />
                  <span>{label}</span>
                  {active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_#a78bfa]" />}
                </button>
              );
            })}
          </nav>

          <div className="mb-3 mt-10 px-2 text-[10px] font-bold tracking-[0.18em] text-slate-600">النظام</div>
          <button onClick={() => changeNav("الإعدادات")} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-[13px] font-semibold transition-all ${activeNav === "الإعدادات" ? "bg-white/[0.06] text-white" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}>
            <Settings2 className="h-[17px] w-[17px] text-slate-600 group-hover:text-slate-300" />
            <span>الإعدادات</span>
          </button>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#171327] to-[#11141b] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Zap className="h-4 w-4" /></div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${ollamaConnected ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{ollamaConnected ? "متصل" : "غير متصل"}</span>
            </div>
            <div className="text-xs font-bold text-slate-200">{ollamaConnected ? "Ollama يعمل محليًا" : "شغّل Ollama للبدء"}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500">{ollamaConnected ? "لا توجد مفاتيح API أو تكاليف استخدام." : "شغّل Ollama محليًا. قد تحتاج لإضافة أصل المنصة إلى OLLAMA_ORIGINS."}</div>
            <button onClick={() => toast.message("أمر التشغيل", { description: "ollama serve — يعمل من جهازك مباشرة." })} className="mt-3 flex items-center gap-2 text-[11px] font-bold text-violet-300 hover:text-violet-200">
              <SquareTerminal className="h-3.5 w-3.5" />
              <span>عرض أمر التشغيل</span>
              <ArrowUpLeft className="mr-auto h-3 w-3" />
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2 px-2 text-[11px] text-slate-600">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>الجهاز جاهز للعمل</span>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:hidden">
              <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400"><Sparkles className="h-4 w-4 text-white" /></div>
              <span className="font-display font-bold text-white">Model Lab</span>
            </div>
            <div className="hidden md:block">
              <div className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-slate-600">الأربعاء، 23 سبتمبر 2026</div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">مرحبًا بك في مختبرك</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن نموذج..." className="h-10 w-[220px] rounded-xl border border-white/[0.08] bg-white/[0.035] pr-10 pl-4 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:bg-white/[0.055]" />
              </div>
              <button onClick={() => toast.info("لا توجد إشعارات جديدة")} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-200"><Bell className="h-[17px] w-[17px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" /></button>
              <button onClick={() => toast.message("حسابك المحلي", { description: "كل إعداداتك محفوظة على هذا الجهاز." })} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.07]"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-[10px] font-black text-[#25140a]">م</span><span className="hidden sm:inline">مستخدم محلي</span></button>
            </div>
          </header>

          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${ollamaConnected ? "text-emerald-300" : "text-amber-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${ollamaConnected ? "bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" : "bg-amber-300"}`} />{ollamaConnected ? "متصل بـ Ollama المحلي" : ollamaError || "بانتظار Ollama المحلي"}</div>
              <h2 className="font-display text-[clamp(1.7rem,3vw,2.65rem)] font-bold leading-[1.15] tracking-[-0.04em] text-white">شغّل الذكاء الاصطناعي<br /><span className="text-slate-500">على جهازك، بطريقتك.</span></h2>
              <p className="mt-3 max-w-[510px] text-sm leading-6 text-slate-500">نزّل النماذج المفتوحة، عدّل إعداداتها، وشغّلها دون اشتراكات أو حدود استخدام.</p>
            </div>
            <button onClick={() => setShowImport(true)} className="hidden shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-[#101219] shadow-[0_8px_30px_rgba(255,255,255,.08)] transition hover:-translate-y-0.5 hover:bg-violet-100 sm:flex"><Upload className="h-4 w-4" />استيراد نموذج</button>
          </div>

          <section className="mb-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "النماذج المحمّلة", value: ollamaConnected ? String(ollamaTags.length).padStart(2, "0") : "—", detail: ollamaConnected ? "من مكتبة Ollama المحلية" : "يتطلب تشغيل Ollama", icon: Download, tone: "violet" },
              { label: "مساحة التخزين", value: localStorageLabel, detail: ollamaConnected ? "الحجم الحقيقي للنماذج" : "بانتظار الاتصال", icon: HardDrive, tone: "cyan" },
              { label: "حالة المعالج", value: runningModels.length > 0 ? "يعمل" : ollamaConnected ? "جاهز" : "—", detail: runningModels.length > 0 ? `${runningModels.length} نموذج قيد التشغيل` : "يُحدّث كل 5 ثوانٍ", icon: Cpu, tone: "emerald" },
            ].map(({ label, value, detail, icon: Icon, tone }) => (
              <div key={label} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.13] hover:bg-white/[0.04]">
                <div className="mb-5 flex items-start justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><div className={`rounded-lg p-2 ${tone === "violet" ? "bg-violet-400/10 text-violet-300" : tone === "cyan" ? "bg-cyan-400/10 text-cyan-300" : "bg-emerald-400/10 text-emerald-300"}`}><Icon className="h-4 w-4" /></div></div>
                <div className="font-display text-2xl font-bold tracking-tight text-white">{value}</div><div className="mt-1 text-[11px] text-slate-600">{detail}</div>
              </div>
            ))}
          </section>

          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-display text-lg font-bold text-white">اكتشف نماذج جديدة</h3><p className="mt-1 text-xs text-slate-600">نماذج مفتوحة المصدر، جاهزة للعمل محليًا</p></div>
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
              {(["الكل", "نص", "صور", "صوت"] as Category[]).map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${category === item ? "bg-white/[0.1] text-white shadow-sm" : "text-slate-600 hover:text-slate-300"}`}>{item}</button>)}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredModels.map((model, index) => {
              const isDownloaded = downloaded.includes(model.id);
              const isDownloading = downloadingId === model.id;
              const isRunning = Boolean(model.ollamaName && runningNames.has(model.ollamaName));
              return (
                <article key={model.id} className="model-card group relative overflow-hidden rounded-2xl border border-white/[0.075] bg-[#10131b]/90 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:shadow-[0_18px_60px_rgba(0,0,0,.25)]" style={{ animationDelay: `${index * 60}ms` }}>
                  <div className={`pointer-events-none absolute -left-8 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${model.color} blur-2xl transition duration-500 group-hover:scale-125`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <button onClick={() => setSelectedModel(model)} className="flex min-w-0 items-center gap-3 text-right">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${model.color} border border-white/[0.09] font-display text-xl font-bold text-white shadow-inner`}>{model.icon}</div>
                      <div className="min-w-0"><h4 className="truncate font-display text-[15px] font-bold text-white transition group-hover:text-violet-200">{model.name}</h4><div className="mt-1 text-[11px] font-medium text-slate-600">{model.family}</div></div>
                    </button>
                    <button onClick={() => setSelectedModel(model)} className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.07] hover:text-slate-300"><MoreHorizontal className="h-4 w-4" /></button>
                  </div>
                  <p className="relative mt-4 min-h-[48px] text-xs leading-5 text-slate-500">{model.description}</p>
                  <div className="relative mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="rounded-md bg-white/[0.055] px-2 py-1 text-slate-400">{model.category}</span><span>{model.size}</span><span className="text-slate-700">•</span><span>{model.updated}</span></div>
                  <div className="relative mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                    <button onClick={() => startDownload(model)} disabled={Boolean(downloadingId && !isDownloading)} className={`relative flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg text-[11px] font-black transition active:scale-[.98] ${isDownloaded ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15" : "bg-violet-500 text-white shadow-[0_8px_20px_rgba(124,92,255,.18)] hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"}`}>
                      {isDownloading && <span className="absolute inset-y-0 right-0 bg-white/10 transition-all" style={{ width: `${downloadProgress}%` }} />}
                      <span className="relative flex items-center gap-2">{isDownloading ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />{downloadProgress}% · {downloadStatus || "جارٍ التنزيل"}</> : isRunning ? <><Play className="h-3.5 w-3.5" />قيد التشغيل الآن</> : isDownloaded ? <><Check className="h-3.5 w-3.5" />محمّل على جهازك</> : <><ArrowDownToLine className="h-3.5 w-3.5" />تنزيل النموذج</>}</span>
                    </button>
                    <button onClick={() => { setSelectedModel(model); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 transition hover:bg-white/[0.06] hover:text-white"><Info className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredModels.length === 0 && <div className="rounded-2xl border border-dashed border-white/[0.1] py-16 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-slate-700" /><div className="text-sm font-bold text-slate-400">لم نجد نموذجًا مطابقًا</div><div className="mt-1 text-xs text-slate-600">جرّب تغيير كلمة البحث أو الفئة.</div></div>}

          <section className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] via-[#151225] to-[#10131b] p-6">
              <div className="absolute -left-6 -top-10 h-40 w-40 rounded-full border border-violet-300/10" /><div className="absolute -left-14 -top-20 h-56 w-56 rounded-full border border-violet-300/[0.06]" />
              <div className="relative max-w-[480px]"><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-violet-300"><Sparkles className="h-3.5 w-3.5" />ابدأ في دقيقة</div><h3 className="font-display text-xl font-bold text-white">لم تستخدم نموذجًا محليًا من قبل؟</h3><p className="mt-2 text-xs leading-6 text-slate-500">نزّل Ollama، ثم اختر نموذجًا من المكتبة. لا حسابات، لا بطاقات، ولا بيانات تغادر جهازك.</p><button onClick={() => toast.message("دليل البدء السريع", { description: "ثبّت Ollama ثم نفّذ: ollama run llama3.2" })} className="mt-5 flex items-center gap-2 text-xs font-black text-violet-300 transition hover:text-white">اقرأ دليل البدء <ChevronLeft className="h-4 w-4" /></button></div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-white">النماذج قيد التشغيل</h3><span className={`flex items-center gap-1.5 text-[10px] font-bold ${ollamaConnected ? "text-emerald-300" : "text-amber-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${ollamaConnected ? "bg-emerald-300" : "bg-amber-300"}`} />{ollamaConnected ? `${runningModels.length} نشط` : "غير متصل"}</span></div>{runningModels.length > 0 ? <div className="space-y-3">{runningModels.map((model) => <div key={model.name} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0b0e14] px-3 py-3"><div className="flex min-w-0 items-center gap-2"><div className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" /><span className="truncate text-xs font-bold text-slate-200">{model.name}</span></div><span className="shrink-0 text-[10px] text-slate-600">{model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB` : "محلي"}</span></div>)}</div> : <div className="flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] text-center"><Cpu className="mb-2 h-5 w-5 text-slate-700" /><div className="text-xs font-bold text-slate-500">{ollamaConnected ? "لا توجد نماذج قيد التشغيل" : "شغّل Ollama لعرض الحالة"}</div><div className="mt-1 text-[10px] text-slate-700">يتم التحديث تلقائيًا كل 5 ثوانٍ</div></div>}</div>
          </section>

          <footer className="mt-8 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-[10px] text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>Model Lab v0.1 · مساحة ذكاء اصطناعي محلية ومفتوحة</span><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />بياناتك تبقى على جهازك</span></footer>
        </main>
      </div>

      {selectedModel && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedModel(null)}><div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#11141c] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-violet-500/15 font-display text-xl font-bold text-violet-200">{selectedModel.icon}</div><div><div className="font-display text-lg font-bold text-white">{selectedModel.name}</div><div className="text-xs text-slate-600">{selectedModel.family}</div></div></div><button onClick={() => setSelectedModel(null)} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button></div><p className="mt-6 text-sm leading-6 text-slate-400">{selectedModel.description}</p><div className="mt-5 grid grid-cols-2 gap-2">{[["الحجم", selectedModel.size], ["المعاملات", selectedModel.params], ["السياق", selectedModel.context], ["الرخصة", selectedModel.license]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="text-[10px] text-slate-600">{label}</div><div className="mt-1 text-xs font-bold text-slate-200">{value}</div></div>)}</div><div className="mt-5 rounded-xl border border-white/[0.06] bg-[#0b0e14] p-3"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-600"><SquareTerminal className="h-3.5 w-3.5" />أمر التشغيل المحلي</div><code className="text-xs text-cyan-300">{selectedModel.ollamaName ? `ollama run ${selectedModel.ollamaName}` : "غير مدعوم في Ollama حاليًا"}</code></div><button onClick={() => { startDownload(selectedModel); setSelectedModel(null); }} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 text-xs font-black text-white transition hover:bg-violet-400"><Play className="h-4 w-4" />{downloaded.includes(selectedModel.id) ? "تشغيل النموذج" : "تنزيل وتشغيل"}</button></div></div>}

      {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowImport(false)}><div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#11141c] p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}><button onClick={() => setShowImport(false)} className="float-left rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300"><Upload className="h-6 w-6" /></div><h3 className="mt-5 font-display text-lg font-bold text-white">استيراد نموذج محلي</h3><p className="mt-2 text-xs leading-6 text-slate-500">اختر ملف GGUF أو مجلد نموذج موجود على جهازك لإضافته إلى مكتبتك.</p><label className="mt-5 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-violet-300/25 bg-violet-400/[0.04] text-xs font-bold text-violet-200 transition hover:bg-violet-400/[0.08]"><Plus className="mb-2 h-5 w-5" /><span>اختر ملفًا من جهازك</span><input type="file" className="hidden" onChange={() => { setShowImport(false); toast.success("تمت إضافة النموذج إلى قائمة الاستيراد"); }} /></label><button onClick={() => setShowImport(false)} className="mt-4 text-xs font-bold text-slate-600 hover:text-slate-300">إلغاء</button></div></div>}
    </div>
  );
}
