import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home, BarChart3, Settings, Plus, ChevronLeft,
  ShoppingBag, HandCoins, Banknote, Lock, ArrowLeftRight, X, Trash2,
  ChevronRight as ChevronRightIcon, Edit3, Check, RefreshCw
} from "lucide-react";

const COLORS = {
  bg: "#11151c", bgCard: "#1b212b", bgCard2: "#222933", border: "#2a3240",
  green: "#22c55e", greenDim: "#16a34a", orange: "#f97316", blue: "#3b82f6",
  red: "#ef4444", purple: "#a855f7", yellow: "#eab308",
  text: "#f3f4f6", textDim: "#9ca3af", textFaint: "#6b7280",
};

const COMPANY_COLORS = ["#ef4444","#3b82f6","#22c55e","#f97316","#a855f7","#eab308","#06b6d4","#ec4899"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (n, d = 2) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtLBP = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const STORAGE_KEY = "delivery_app_data";

const DEFAULT_DATA = {
  exchangeRate: 89000,
  companies: [],
  entries: [],
  closures: [],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_DATA;
  } catch { return DEFAULT_DATA; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function BigButton({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: color, border: "none", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", WebkitTapHighlightColor: "transparent" }}>
      <Icon size={26} strokeWidth={2.2} />
      <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function StatBox({ label, value, color, prefix = "$" }) {
  return (
    <div style={{ background: COLORS.bgCard, borderRadius: 14, padding: "12px 10px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{prefix} {fmt(value)}</div>
    </div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
      <div style={{ width: 36 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", padding: 6 }}><ChevronRightIcon size={24} /></button>}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.text }}>{title}</div>
      <div style={{ width: 36, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "13px 14px", color: COLORS.text, fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function SaveButton({ onClick, label = "حفظ", color = COLORS.green, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", background: disabled ? COLORS.textFaint : color, border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontSize: 17, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", marginTop: 8 }}>
      {label}
    </button>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || COLORS.text }}>{value}</span>
    </div>
  );
}

function fmtDual(usd, lbp) {
  const parts = [];
  if (usd) parts.push(`$${fmt(usd)}`);
  if (lbp) parts.push(`${fmtLBP(lbp)} ل.ل`);
  return parts.length === 0 ? "$0.00" : parts.join(" + ");
}

function toDatetimeLocal(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeCompanyStats(data, companyId) {
  const entries = data.entries.filter((e) => e.companyId === companyId);
  let profit = 0, debt = 0, expense = 0, tips = 0, dueToCompany = 0, paidUSD = 0, paidLBP = 0;
  entries.forEach((e) => {
    if (e.type === "order") {
      profit += e.profitTotalUSD || 0; tips += e.tipsTotalUSD || 0;
      dueToCompany += e.dueToCompanyUSD || 0;
      paidUSD += e.paidUSD || 0; paidLBP += e.paidLBP || 0;
    } else if (e.type === "debt") {
      if (e.direction === "owedByMe") { debt -= e.amountUSD; paidUSD -= e.rawUSD || 0; paidLBP -= e.amountLBP || 0; }
      else { debt += e.amountUSD; paidUSD += e.rawUSD || 0; paidLBP += e.amountLBP || 0; }
    } else if (e.type === "repay") {
      debt -= e.amountUSD;
    } else if (e.type === "expense") {
      expense += e.amountUSD; paidUSD -= e.rawUSD || 0; paidLBP -= e.amountLBP || 0;
    }
  });
  return { profit, debt, expense, tips, dueToCompany, paidUSD, paidLBP };
}

function computeTotals(data) {
  let profit = 0, debt = 0, expense = 0, tips = 0, dueToCompany = 0, paidUSD = 0, paidLBP = 0;
  data.companies.forEach((c) => {
    const s = computeCompanyStats(data, c.id);
    profit += s.profit; debt += s.debt; expense += s.expense; tips += s.tips;
    dueToCompany += s.dueToCompany; paidUSD += s.paidUSD; paidLBP += s.paidLBP;
  });
  data.entries.forEach((e) => {
    if (e.type === "convert") { paidUSD -= e.fromUSD||0; paidUSD += e.toUSD||0; paidLBP -= e.fromLBP||0; paidLBP += e.toLBP||0; }
  });
  return { profit, debt, expense, tips, dueToCompany, paidUSD, paidLBP };
}

export default function DeliveryApp() {
  const [data, setData] = useState(() => loadData());
  const [screen, setScreen] = useState("home");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [entryFormType, setEntryFormType] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const persist = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const company = data.companies.find((c) => c.id === selectedCompanyId);
  const showNav = ["home", "reports", "settings"].includes(screen);

  const quickStart = (companyId, type) => {
    setSelectedCompanyId(companyId); setEntryFormType(type);
    setEditingEntryId(null); setQuickAddOpen(false); setScreen("entryForm");
  };

  let content;
  if (screen === "home") {
    content = <HomeScreen data={data} onOpenCompany={(id) => { setSelectedCompanyId(id); setScreen("company"); }} onAddCompany={() => setScreen("addCompany")} onOpenConvert={() => setScreen("convert")} onQuickAction={quickStart} />;
  } else if (screen === "addCompany") {
    content = <AddCompanyScreen onBack={() => setScreen("home")} onSave={(name, color) => { persist((prev) => ({ ...prev, companies: [...prev.companies, { id: uid(), name, color }] })); showToast("تمت إضافة الشركة"); setScreen("home"); }} />;
  } else if (screen === "company" && company) {
    content = <CompanyScreen data={data} persist={persist} company={company} onBack={() => setScreen("home")} onAction={(type) => { setEntryFormType(type); setEditingEntryId(null); setScreen("entryForm"); }} onEditEntry={(entry) => { setEntryFormType(entry.type); setEditingEntryId(entry.id); setScreen("entryForm"); }} onCloseAccount={() => setScreen("closeAccount")} showToast={showToast} onDeleteCompany={() => { persist((prev) => ({ ...prev, companies: prev.companies.filter((c) => c.id !== company.id), entries: prev.entries.filter((e) => e.companyId !== company.id) })); setScreen("home"); }} />;
  } else if (screen === "entryForm" && company) {
    const editingEntry = editingEntryId ? data.entries.find((e) => e.id === editingEntryId) : null;
    content = <EntryFormScreen type={entryFormType} company={company} companies={data.companies} data={data} editingEntry={editingEntry} onBack={() => { setEditingEntryId(null); setScreen("company"); }} onSave={(entry) => { persist((prev) => { if (editingEntryId) return { ...prev, entries: prev.entries.map((e) => e.id === editingEntryId ? entry : e) }; return { ...prev, entries: [...prev.entries, entry] }; }); showToast(editingEntryId ? "تم تعديل العملية" : "تم الحفظ"); setEditingEntryId(null); setScreen("company"); }} />;
  } else if (screen === "closeAccount" && company) {
    content = <CloseAccountScreen company={company} data={data} persist={persist} onBack={() => setScreen("company")} showToast={showToast} onDone={() => setScreen("company")} />;
  } else if (screen === "convert") {
    content = <ConvertScreen data={data} persist={persist} onBack={() => setScreen("home")} showToast={showToast} />;
  } else if (screen === "reports") {
    content = <ReportsScreen data={data} />;
  } else if (screen === "settings") {
    content = <SettingsScreen data={data} persist={persist} onBack={() => setScreen("home")} showToast={showToast} />;
  } else {
    content = <HomeScreen data={data} onOpenCompany={(id) => { setSelectedCompanyId(id); setScreen("company"); }} onAddCompany={() => setScreen("addCompany")} onOpenConvert={() => setScreen("convert")} onQuickAction={quickStart} />;
  }

  return (
    <div dir="rtl" style={{ height: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", color: COLORS.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", minHeight: 0 }}>
        {content}
        <div style={{ height: 16 }} />
      </div>
      {toast && <div style={{ position: "absolute", bottom: showNav ? 78 : 16, left: "50%", transform: "translateX(-50%)", background: COLORS.greenDim, color: "#fff", padding: "10px 22px", borderRadius: 30, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 100 }}>{toast}</div>}
      {showNav && <BottomNav screen={screen} setScreen={setScreen} />}
      {showNav && <button onClick={() => setQuickAddOpen(true)} style={{ position: "absolute", bottom: 88, insetInlineEnd: 20, width: 56, height: 56, borderRadius: 99, background: COLORS.green, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(34,197,94,0.45)", cursor: "pointer", zIndex: 60 }}><Plus size={28} strokeWidth={2.4} /></button>}
      {quickAddOpen && <QuickAddSheet companies={data.companies} onClose={() => setQuickAddOpen(false)} onPick={quickStart} />}
    </div>
  );
}

function BottomNav({ screen, setScreen }) {
  const items = [{ key: "reports", label: "التقارير", icon: BarChart3 }, { key: "home", label: "الرئيسية", icon: Home }, { key: "settings", label: "الإعدادات", icon: Settings }];
  return (
    <div style={{ flexShrink: 0, background: COLORS.bgCard, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 calc(10px + env(safe-area-inset-bottom))", zIndex: 50 }}>
      {items.map((it) => { const active = screen === it.key; const Icon = it.icon; return <button key={it.key} onClick={() => setScreen(it.key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? COLORS.green : COLORS.textFaint, cursor: "pointer" }}><Icon size={22} /><span style={{ fontSize: 11, fontWeight: 700 }}>{it.label}</span></button>; })}
    </div>
  );
}

function QuickAddSheet({ companies, onClose, onPick }) {
  const [pickedCompany, setPickedCompany] = useState(null);
  const actions = [{ type: "order", label: "إدخال طلب", icon: ShoppingBag, color: COLORS.green }, { type: "debt", label: "إدخال دين", icon: Plus, color: COLORS.orange }, { type: "repay", label: "تسديد دين", icon: HandCoins, color: COLORS.blue }, { type: "expense", label: "مصروف", icon: Banknote, color: COLORS.red }];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: COLORS.bgCard, borderRadius: "20px 20px 0 0", padding: "18px 16px calc(20px + env(safe-area-inset-bottom))", maxHeight: "75vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 99, margin: "0 auto 16px" }} />
        {!pickedCompany ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, textAlign: "center" }}>اختر الشركة</div>
            {companies.length === 0 ? <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "20px 0", fontSize: 14 }}>لا توجد شركات. أضف شركة من الرئيسية أولاً.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {companies.map((c) => <button key={c.id} onClick={() => setPickedCompany(c)} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 12, cursor: "pointer", textAlign: "right" }}><div style={{ width: 38, height: 38, borderRadius: 10, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>{c.name.slice(0, 1)}</div><div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div></button>)}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setPickedCompany(null)} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", padding: 4 }}><ChevronRightIcon size={20} /></button>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: pickedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 13 }}>{pickedCompany.name.slice(0, 1)}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{pickedCompany.name}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {actions.map((a) => <BigButton key={a.type} icon={a.icon} label={a.label} color={a.color} onClick={() => onPick(pickedCompany.id, a.type)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ data, onOpenCompany, onAddCompany, onOpenConvert, onQuickAction }) {
  const totals = computeTotals(data);
  const todayStr = new Date().toDateString();
  const todayEntries = data.entries.filter((e) => new Date(e.createdAt).toDateString() === todayStr);
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>الرئيسية</div>
        <button onClick={onOpenConvert} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "8px 12px", color: COLORS.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><ArrowLeftRight size={16} /><span style={{ fontSize: 13, fontWeight: 700 }}>تحويل عملة</span></button>
      </div>
      <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 8, fontWeight: 700 }}>المجموع الكلي المقبوض من الزبائن</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: COLORS.green, borderRadius: 16, padding: "16px 14px" }}><div style={{ color: "#fff", fontSize: 12, fontWeight: 700, opacity: 0.85 }}>$ مجموع الدولار</div><div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>${fmt(totals.paidUSD)}</div></div>
        <div style={{ flex: 1, background: COLORS.blue, borderRadius: 16, padding: "16px 14px" }}><div style={{ color: "#fff", fontSize: 12, fontWeight: 700, opacity: 0.85 }}>ل.ل مجموع الليرة</div><div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{fmtLBP(totals.paidLBP)}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatBox label="إجمالي الأرباح" value={totals.profit} color={COLORS.green} />
        <StatBox label="إجمالي المصروف" value={totals.expense} color={COLORS.red} />
        <StatBox label="إجمالي الديون" value={totals.debt} color={COLORS.orange} />
        <StatBox label="إجمالي التيبس" value={totals.tips} color={COLORS.purple} />
        <StatBox label="مرتب للشركة" value={totals.dueToCompany} color={COLORS.yellow} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>الشركات</div>
        <button onClick={onAddCompany} style={{ background: "none", border: "none", color: COLORS.green, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={16} /> إضافة شركة</button>
      </div>
      {data.companies.length === 0 && <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "40px 0", fontSize: 14 }}>لا توجد شركات بعد. اضغط "إضافة شركة" للبدء</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.companies.map((c) => {
          const s = computeCompanyStats(data, c.id);
          const todayCount = todayEntries.filter((e) => e.companyId === c.id && e.type === "order").length;
          return (
            <div key={c.id} onClick={() => onOpenCompany(c.id)} role="button" style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.name.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>الطلبات اليوم: {todayCount} &nbsp;|&nbsp; الأرباح: <span style={{ color: COLORS.green }}>${fmt(s.profit, 2)}</span></div>
                  <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>الدين: <span style={{ color: s.debt > 0 ? COLORS.orange : COLORS.textFaint }}>${fmt(s.debt, 2)}</span></div>
                </div>
                <ChevronLeft size={20} color={COLORS.textFaint} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={(ev) => { ev.stopPropagation(); onQuickAction(c.id, "order"); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.green, border: "none", borderRadius: 10, padding: "9px 0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Plus size={15} /> طلب</button>
                <button onClick={(ev) => { ev.stopPropagation(); onQuickAction(c.id, "expense"); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.red, border: "none", borderRadius: 10, padding: "9px 0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Plus size={15} /> مصروف</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddCompanyScreen({ onBack, onSave }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COMPANY_COLORS[0]);
  return (
    <div>
      <TopBar title="إضافة شركة جديدة" onBack={onBack} />
      <div style={{ padding: "0 16px" }}>
        <Field label="اسم الشركة"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Godzilla" autoFocus /></Field>
        <Field label="لون الشركة"><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{COMPANY_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 40, height: 40, borderRadius: 12, background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer" }} />)}</div></Field>
        <SaveButton disabled={!name.trim()} onClick={() => onSave(name.trim(), color)} />
      </div>
    </div>
  );
}

function CompanyScreen({ data, persist, company, onBack, onAction, onEditEntry, onCloseAccount, showToast, onDeleteCompany }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const s = computeCompanyStats(data, company.id);
  const allEntries = data.entries.filter((e) => e.companyId === company.id).sort((a, b) => b.createdAt - a.createdAt);
  const entries = useMemo(() => {
    const q = search.trim();
    if (!q) return allEntries;
    const qNum = parseFloat(q.replace(",", "."));
    return allEntries.filter((e) => {
      if (e.type === "order") { if (!isNaN(qNum)) { if (Math.abs((e.orderValueTotalUSD||0)-qNum)<0.01) return true; if (Math.abs((e.orderValueUSD||0)-qNum)<0.01) return true; } if (e.orderNumber && e.orderNumber.includes(q)) return true; return false; }
      if (!isNaN(qNum)) return Math.abs((e.amountUSD||0)-qNum)<0.01;
      return false;
    });
  }, [allEntries, search]);
  const deleteEntry = (id) => { persist((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) })); showToast("تم الحذف"); };
  return (
    <div>
      <TopBar title={company.name} onBack={onBack} right={
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((m) => !m)} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer" }}>⋮</button>
          {menuOpen && <div style={{ position: "absolute", top: 30, left: 0, background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden", zIndex: 20, minWidth: 140 }}><button onClick={() => { setMenuOpen(false); onDeleteCompany(); }} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: COLORS.red, fontSize: 13, fontWeight: 700, textAlign: "right", cursor: "pointer" }}>حذف الشركة</button></div>}
        </div>
      } />
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: company.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>{company.name.slice(0, 1)}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{company.name}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <StatBox label="مجموع الأرباح" value={s.profit} color={COLORS.green} />
          <StatBox label="مجموع التيبس" value={s.tips} color={COLORS.purple} />
          <StatBox label="مجموع الديون" value={s.debt} color={COLORS.orange} />
          <StatBox label="مجموع المصروف" value={s.expense} color={COLORS.red} />
          <StatBox label="مرتب للشركة" value={s.dueToCompany} color={COLORS.yellow} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <BigButton icon={ShoppingBag} label="إدخال طلب" color={COLORS.green} onClick={() => onAction("order")} />
          <BigButton icon={Plus} label="إدخال دين" color={COLORS.orange} onClick={() => onAction("debt")} />
          <BigButton icon={HandCoins} label="تسديد دين" color={COLORS.blue} onClick={() => onAction("repay")} />
          <BigButton icon={Banknote} label="مصروف" color={COLORS.red} onClick={() => onAction("expense")} />
        </div>
        <button onClick={onCloseAccount} style={{ width: "100%", background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px", color: COLORS.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, cursor: "pointer", marginBottom: 20, fontSize: 15 }}><Lock size={16} /> تسكير حساب</button>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>سجل العمليات</div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input style={{ ...inputStyle, paddingInlineStart: 38 }} value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder="بحث بقيمة الطلب أو رقمه..." inputMode="decimal" />
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textFaint }}>🔍</span>
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}><X size={16} /></button>}
        </div>
        {entries.length === 0 && <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "30px 0", fontSize: 14 }}>{search ? "لا توجد نتائج مطابقة" : "لا توجد عمليات بعد"}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {entries.map((e) => <EntryRow key={e.id} entry={e} onDelete={() => deleteEntry(e.id)} onEdit={() => onEditEntry(e)} />)}
        </div>
      </div>
    </div>
  );
}

const TYPE_LABELS = { order: "طلب جديد", debt: "دين على الشركة", repay: "تسديد دين", expense: "مصروف" };
const TYPE_COLORS = { order: COLORS.green, debt: COLORS.orange, repay: COLORS.blue, expense: COLORS.red };

function EntryRow({ entry, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const dt = new Date(entry.createdAt);
  const time = dt.toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dt.toLocaleDateString("ar-LB", { day: "2-digit", month: "2-digit" });
  const color = TYPE_COLORS[entry.type];
  const label = entry.type === "debt" ? (entry.direction === "owedByMe" ? "دين عليّ" : "دين لي على الشركة") : TYPE_LABELS[entry.type];
  const mainAmount = entry.type === "order" ? entry.dueToCompanyUSD : entry.amountUSD;
  return (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
          <div><div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 11, color: COLORS.textFaint }}>{dateStr} · {time}</div></div>
        </div>
        <div style={{ fontWeight: 800, color, fontSize: 15 }}>${fmt(mainAmount)}</div>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.textDim, display: "flex", flexDirection: "column", gap: 4 }}>
          {entry.type === "order" && (<><Row label="قيمة الطلب" value={fmtDual(entry.orderValueUSD, entry.orderValueLBP)} /><Row label="الربح" value={fmtDual(entry.profitUSD, entry.profitLBP)} /><div style={{ background: COLORS.bgCard2, borderRadius: 10, padding: "8px 10px", margin: "4px 0" }}><Row label="المطلوب للشركة" value={`$${fmt(entry.dueToCompanyUSD)}`} valueColor={COLORS.orange} /></div><Row label="المقبوض دولار" value={`$${fmt(entry.paidUSD)}`} /><Row label="المقبوض ليرة" value={`${fmtLBP(entry.paidLBP)} ل.ل`} /><Row label="التيبس" value={`${entry.tipsTotalUSD >= 0 ? "+" : ""}${fmtDual(entry.tipsUSD, entry.tipsLBP)}`} valueColor={entry.tipsTotalUSD >= 0 ? COLORS.green : COLORS.red} />{entry.orderNumber && <Row label="رقم الطلب" value={entry.orderNumber} />}{entry.note && <Row label="ملاحظات" value={entry.note} />}</>)}
          {entry.type !== "order" && (<>{(entry.type === "expense" || entry.type === "debt") && entry.amountLBP ? <Row label="المبلغ" value={fmtDual(entry.rawUSD||entry.amountUSD, entry.amountLBP)} /> : <Row label="المبلغ" value={`$${fmt(entry.amountUSD)}`} />}{entry.reason && <Row label="السبب / النوع" value={entry.reason} />}{entry.note && <Row label="ملاحظات" value={entry.note} />}</>)}
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            <button onClick={onEdit} style={{ background: "none", border: "none", color: COLORS.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={13} /> تعديل</button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DualCurrencyField({ label, usd, lbp, onUsdChange, onLbpChange }) {
  const lbpActual = (parseFloat(lbp) || 0) * 1000;
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input style={{ ...inputStyle, paddingInlineStart: 28 }} type="number" inputMode="decimal" value={usd} onChange={(e) => onUsdChange(e.target.value)} placeholder="0.00" />
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textFaint, fontSize: 14, fontWeight: 700 }}>$</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingInlineEnd: 46 }} type="number" inputMode="decimal" value={lbp} onChange={(e) => onLbpChange(e.target.value)} placeholder="0" />
            <span style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textFaint, fontSize: 12, fontWeight: 700 }}>ألف ل.ل</span>
          </div>
          {lbp !== "" && <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4, textAlign: "left" }}>= {fmtLBP(lbpActual)} ل.ل</div>}
        </div>
      </div>
    </Field>
  );
}

function EntryFormScreen({ type, company, companies, data, editingEntry, onBack, onSave }) {
  if (type === "order") return <OrderForm company={company} companies={companies} data={data} editingEntry={editingEntry} onBack={onBack} onSave={onSave} />;
  return <SimpleForm type={type} company={company} companies={companies} data={data} editingEntry={editingEntry} onBack={onBack} onSave={onSave} />;
}

function OrderForm({ company, companies, data, editingEntry, onBack, onSave }) {
  const e = editingEntry;
  const [companyId, setCompanyId] = useState(e ? e.companyId : company.id);
  const [orderValueUSD, setOrderValueUSD] = useState(e ? String(e.orderValueUSD||"") : "");
  const [orderValueLBP, setOrderValueLBP] = useState(e ? String((e.orderValueLBP||0)/1000||"") : "");
  const [profitUSD, setProfitUSD] = useState(e ? String(e.profitUSD||"") : "");
  const [profitLBP, setProfitLBP] = useState(e ? String((e.profitLBP||0)/1000||"") : "");
  const [paidUSD, setPaidUSD] = useState(e ? String(e.paidUSD||"") : "");
  const [paidLBP, setPaidLBP] = useState(e ? String((e.paidLBP||0)/1000||"") : "");
  const [orderNumber, setOrderNumber] = useState(e ? e.orderNumber||"" : "");
  const [note, setNote] = useState(e ? e.note||"" : "");
  const [dateTime, setDateTime] = useState(e ? toDatetimeLocal(e.createdAt) : toDatetimeLocal(Date.now()));
  const rate = data.exchangeRate || 1;
  const ovUSD = parseFloat(orderValueUSD)||0, ovLBP = (parseFloat(orderValueLBP)||0)*1000;
  const prUSD = parseFloat(profitUSD)||0, prLBP = (parseFloat(profitLBP)||0)*1000;
  const pUSD = parseFloat(paidUSD)||0, pLBP = (parseFloat(paidLBP)||0)*1000;
  const orderValueTotalUSD = ovUSD + ovLBP/rate;
  const profitTotalUSD = prUSD + prLBP/rate;
  const dueToCompanyUSD = orderValueTotalUSD - profitTotalUSD;
  const paidTotalUSD = pUSD + pLBP/rate;
  const tipsTotalUSD = paidTotalUSD - profitTotalUSD - dueToCompanyUSD;
  const tipsTotalLBP = tipsTotalUSD * rate;
  const grandTotalUSD = orderValueTotalUSD + profitTotalUSD + paidTotalUSD + tipsTotalUSD;
  const valid = orderValueTotalUSD > 0;
  const save = () => onSave({ id: e?e.id:uid(), companyId, type: "order", orderValueUSD: ovUSD, orderValueLBP: ovLBP, orderValueTotalUSD, profitUSD: prUSD, profitLBP: prLBP, profitTotalUSD, dueToCompanyUSD, paidUSD: pUSD, paidLBP: pLBP, paidTotalUSD, tipsUSD: tipsTotalUSD, tipsLBP: tipsTotalLBP, tipsTotalUSD, orderNumber: orderNumber.trim(), note: note.trim(), createdAt: new Date(dateTime).getTime()||Date.now() });
  return (
    <div>
      <TopBar title={e ? "تعديل الطلب" : "إدخال طلب جديد"} onBack={onBack} />
      <div style={{ padding: "0 16px" }}>
        {companies.length > 1 && <Field label="الشركة"><select style={{ ...inputStyle, appearance: "none" }} value={companyId} onChange={(ev) => setCompanyId(ev.target.value)}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 10, fontWeight: 700 }}>المجموع الكلي لهذا الطلب</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, background: COLORS.green, borderRadius: 12, padding: "12px 10px" }}><div style={{ color: "#fff", fontSize: 11, fontWeight: 700, opacity: 0.85 }}>$ بالدولار</div><div style={{ color: "#fff", fontSize: 17, fontWeight: 800, marginTop: 2 }}>${fmt(grandTotalUSD)}</div></div>
            <div style={{ flex: 1, background: COLORS.blue, borderRadius: 12, padding: "12px 10px" }}><div style={{ color: "#fff", fontSize: 11, fontWeight: 700, opacity: 0.85 }}>ل.ل بالليرة</div><div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginTop: 2 }}>{fmtLBP(grandTotalUSD * rate)}</div></div>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4, fontWeight: 700 }}>مرتب للشركة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.orange }}>${fmt(dueToCompanyUSD)}</div>
            <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 2 }}>≈ {fmtLBP(dueToCompanyUSD * rate)} ل.ل</div>
          </div>
        </div>
        <DualCurrencyField label="قيمة الطلب" usd={orderValueUSD} lbp={orderValueLBP} onUsdChange={setOrderValueUSD} onLbpChange={setOrderValueLBP} />
        <DualCurrencyField label="الربح" usd={profitUSD} lbp={profitLBP} onUsdChange={setProfitUSD} onLbpChange={setProfitLBP} />
        <DualCurrencyField label="المقبوض من الزبون" usd={paidUSD} lbp={paidLBP} onUsdChange={setPaidUSD} onLbpChange={setPaidLBP} />
        <div style={{ background: COLORS.bgCard2, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <Row label="التيبس" value={`${tipsTotalUSD >= 0 ? "+" : ""}$${fmt(tipsTotalUSD)} (${fmtLBP(tipsTotalLBP)} ل.ل)`} valueColor={tipsTotalUSD >= 0 ? COLORS.green : COLORS.red} />
        </div>
        <Field label="رقم الطلب (اختياري)"><input style={inputStyle} value={orderNumber} onChange={(ev) => setOrderNumber(ev.target.value)} placeholder="#1258" /></Field>
        <Field label="ملاحظات (اختياري)"><input style={inputStyle} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="مثال: طلب من مطعم..." /></Field>
        <Field label="التاريخ والوقت"><input style={inputStyle} type="datetime-local" value={dateTime} onChange={(ev) => setDateTime(ev.target.value)} /></Field>
        <SaveButton disabled={!valid} onClick={save} label={e ? "حفظ التعديلات" : "حفظ"} />
      </div>
    </div>
  );
}

const FORM_CONFIG = {
  debt: { title: "إدخال دين", editTitle: "تعديل الدين", color: COLORS.orange, reasonLabel: "السبب (اختياري)", reasonPlaceholder: "مثال: دين على الشركة" },
  repay: { title: "تسديد دين", editTitle: "تعديل التسديد", color: COLORS.blue, reasonLabel: "نوع التسديد (اختياري)", reasonPlaceholder: "مثال: تسديد جزئي" },
  expense: { title: "مصروف", editTitle: "تعديل المصروف", color: COLORS.red, reasonLabel: "النوع (اختياري)", reasonPlaceholder: "مثال: بنزين" },
};

function SimpleForm({ type, company, companies, data, editingEntry, onBack, onSave }) {
  const cfg = FORM_CONFIG[type];
  const e = editingEntry;
  const isDual = type === "expense" || type === "debt";
  const hasDirection = type === "debt";
  const rate = data.exchangeRate || 1;
  const [companyId, setCompanyId] = useState(e ? e.companyId : company.id);
  const [direction, setDirection] = useState(e ? e.direction||"owedToMe" : "owedToMe");
  const [amount, setAmount] = useState(e ? String(e.rawUSD!=null?e.rawUSD:e.amountUSD||"") : "");
  const [amountLBP, setAmountLBP] = useState(e ? String((e.amountLBP||0)/1000||"") : "");
  const [reason, setReason] = useState(e ? e.reason||"" : "");
  const [note, setNote] = useState(e ? e.note||"" : "");
  const [dateTime, setDateTime] = useState(e ? toDatetimeLocal(e.createdAt) : toDatetimeLocal(Date.now()));
  const amtUSD = parseFloat(amount)||0;
  const amtLBPReal = isDual ? (parseFloat(amountLBP)||0)*1000 : 0;
  const amtTotalUSD = amtUSD + amtLBPReal/rate;
  const valid = amtTotalUSD > 0;
  const save = () => onSave({ id: e?e.id:uid(), companyId, type, direction: hasDirection?direction:undefined, amountUSD: isDual?amtTotalUSD:amtUSD, amountLBP: isDual?amtLBPReal:0, rawUSD: amtUSD, reason: reason.trim(), note: note.trim(), createdAt: new Date(dateTime).getTime()||Date.now() });
  return (
    <div>
      <TopBar title={e ? cfg.editTitle : cfg.title} onBack={onBack} />
      <div style={{ padding: "0 16px" }}>
        {companies.length > 1 && <Field label="الشركة"><select style={{ ...inputStyle, appearance: "none" }} value={companyId} onChange={(ev) => setCompanyId(ev.target.value)}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        {hasDirection && <Field label="نوع الدين"><div style={{ display: "flex", gap: 8 }}><button onClick={() => setDirection("owedToMe")} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer", background: direction==="owedToMe"?COLORS.green:COLORS.bgCard2, color: direction==="owedToMe"?"#fff":COLORS.textDim }}>دين لي (على الشركة)</button><button onClick={() => setDirection("owedByMe")} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer", background: direction==="owedByMe"?COLORS.red:COLORS.bgCard2, color: direction==="owedByMe"?"#fff":COLORS.textDim }}>دين عليّ</button></div></Field>}
        {isDual ? <DualCurrencyField label="المبلغ" usd={amount} lbp={amountLBP} onUsdChange={setAmount} onLbpChange={setAmountLBP} /> : <Field label="المبلغ ($)"><input style={inputStyle} type="number" inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="0.00" autoFocus /></Field>}
        <Field label={cfg.reasonLabel}><input style={inputStyle} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder={cfg.reasonPlaceholder} /></Field>
        <Field label="ملاحظات (اختياري)"><input style={inputStyle} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="ملاحظات إضافية" /></Field>
        <Field label="التاريخ والوقت"><input style={inputStyle} type="datetime-local" value={dateTime} onChange={(ev) => setDateTime(ev.target.value)} /></Field>
        <SaveButton disabled={!valid} onClick={save} color={cfg.color} label={e ? "حفظ التعديلات" : "حفظ"} />
      </div>
    </div>
  );
}

function CloseAccountScreen({ company, data, persist, onBack, showToast, onDone }) {
  const s = computeCompanyStats(data, company.id);
  const doClose = () => { persist((prev) => ({ ...prev, closures: [...prev.closures, { id: uid(), companyId: company.id, date: Date.now(), profit: s.profit, debt: s.debt, expense: s.expense, tips: s.tips }] })); showToast("تم تسكير الحساب"); onDone(); };
  return (
    <div>
      <TopBar title="تسكير حساب" onBack={onBack} />
      <div style={{ padding: "0 16px" }}>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>ملخص حساب {company.name}</div>
          <Row label="الأرباح" value={`$${fmt(s.profit)}`} valueColor={COLORS.green} />
          <div style={{ height: 8 }} />
          <Row label="المصروف" value={`$${fmt(s.expense)}`} valueColor={COLORS.red} />
          <div style={{ height: 8 }} />
          <Row label="الدين الحالي" value={`$${fmt(s.debt)}`} valueColor={COLORS.orange} />
          <div style={{ height: 8 }} />
          <Row label="التيبس" value={`$${fmt(s.tips)}`} valueColor={COLORS.purple} />
        </div>
        <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 16, lineHeight: 1.6 }}>تسكير الحساب يحفظ نسخة من الملخص الحالي بتاريخ اليوم. هذا لا يحذف العمليات.</div>
        <SaveButton label="تأكيد تسكير الحساب" color={COLORS.bgCard2} onClick={doClose} />
      </div>
    </div>
  );
}

function ConvertScreen({ data, persist, onBack, showToast }) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("usd_to_lbp");
  const rate = data.exchangeRate || 1;
  const amt = parseFloat(amount) || 0;
  const amtForCalc = direction === "lbp_to_usd" ? amt * 1000 : amt;
  const result = direction === "usd_to_lbp" ? amtForCalc * rate : amtForCalc / rate;
  const valid = amtForCalc > 0;
  const confirm = () => {
    const entry = direction === "usd_to_lbp" ? { id: uid(), type: "convert", companyId: null, fromUSD: amtForCalc, toLBP: result, fromLBP: 0, toUSD: 0, createdAt: Date.now() } : { id: uid(), type: "convert", companyId: null, fromLBP: amtForCalc, toUSD: result, fromUSD: 0, toLBP: 0, createdAt: Date.now() };
    persist((prev) => ({ ...prev, entries: [...prev.entries, entry] }));
    showToast("تم تأكيد التحويل"); setAmount("");
  };
  return (
    <div>
      <TopBar title="تحويل العملة" onBack={onBack} />
      <div style={{ padding: "0 16px" }}>
        <div style={{ textAlign: "center", color: COLORS.textDim, fontSize: 13, marginBottom: 18 }}>سعر الصرف الحالي: 1$ = {fmtLBP(rate)} ل.ل</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, background: COLORS.bgCard2, borderRadius: 12, padding: 4 }}>
          <button onClick={() => setDirection("usd_to_lbp")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer", background: direction==="usd_to_lbp"?COLORS.green:"transparent", color: direction==="usd_to_lbp"?"#fff":COLORS.textDim }}>دولار ← ليرة</button>
          <button onClick={() => setDirection("lbp_to_usd")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer", background: direction==="lbp_to_usd"?COLORS.blue:"transparent", color: direction==="lbp_to_usd"?"#fff":COLORS.textDim }}>ليرة ← دولار</button>
        </div>
        <Field label={direction==="usd_to_lbp"?"المبلغ بالدولار":"المبلغ بالليرة (بالألف)"}>
          <input style={inputStyle} type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </Field>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 8 }}>النتيجة</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: direction==="usd_to_lbp"?COLORS.blue:COLORS.green }}>{direction==="usd_to_lbp"?`${fmtLBP(result)} ل.ل`:`$${fmt(result)}`}</div>
        </div>
        <SaveButton label="تأكيد التحويل" onClick={confirm} disabled={!valid} />
      </div>
    </div>
  );
}

function ReportsScreen({ data }) {
  const [period, setPeriod] = useState("day");
  const [refDate, setRefDate] = useState(new Date());
  const range = useMemo(() => {
    const d = new Date(refDate);
    let start, end;
    if (period==="day") { start=new Date(d.setHours(0,0,0,0)); end=new Date(d.setHours(23,59,59,999)); }
    else if (period==="week") { const day=d.getDay(); start=new Date(d); start.setDate(d.getDate()-day); start.setHours(0,0,0,0); end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999); }
    else if (period==="month") { start=new Date(d.getFullYear(),d.getMonth(),1); end=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999); }
    else { start=new Date(d.getFullYear(),0,1); end=new Date(d.getFullYear(),11,31,23,59,59,999); }
    return { start, end };
  }, [period, refDate]);
  const filtered = data.entries.filter((e) => e.createdAt >= range.start.getTime() && e.createdAt <= range.end.getTime());
  let profit=0, expense=0, debt=0, tips=0, dueToCompany=0;
  filtered.forEach((e) => { if(e.type==="order"){profit+=e.profitTotalUSD||0;tips+=e.tipsTotalUSD||0;dueToCompany+=e.dueToCompanyUSD||0;} else if(e.type==="debt")debt+=e.amountUSD; else if(e.type==="repay")debt-=e.amountUSD; else if(e.type==="expense")expense+=e.amountUSD; });
  const net = profit - expense;
  const shift = (dir) => { const d=new Date(refDate); if(period==="day")d.setDate(d.getDate()+dir); else if(period==="week")d.setDate(d.getDate()+dir*7); else if(period==="month")d.setMonth(d.getMonth()+dir); else d.setFullYear(d.getFullYear()+dir); setRefDate(d); };
  const label = useMemo(() => {
    if(period==="day") return range.start.toLocaleDateString("ar-LB",{year:"numeric",month:"2-digit",day:"2-digit"});
    if(period==="week") return `${range.start.toLocaleDateString("ar-LB",{month:"2-digit",day:"2-digit"})} - ${range.end.toLocaleDateString("ar-LB",{month:"2-digit",day:"2-digit"})}`;
    if(period==="month") return range.start.toLocaleDateString("ar-LB",{year:"numeric",month:"long"});
    return range.start.getFullYear().toString();
  }, [period, range]);
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>التقارير</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: COLORS.bgCard2, borderRadius: 12, padding: 4 }}>
        {[{k:"day",l:"يومي"},{k:"week",l:"أسبوعي"},{k:"month",l:"شهري"},{k:"year",l:"سنوي"}].map((p) => <button key={p.k} onClick={() => setPeriod(p.k)} style={{ flex:1, padding:"9px 4px", borderRadius:9, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", background:period===p.k?COLORS.yellow:"transparent", color:period===p.k?"#111":COLORS.textDim }}>{p.l}</button>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, background: COLORS.bgCard, borderRadius: 12, padding: "10px 14px", border: `1px solid ${COLORS.border}` }}>
        <button onClick={() => shift(-1)} style={{ background:"none", border:"none", color:COLORS.text, cursor:"pointer" }}><ChevronRightIcon size={20} /></button>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        <button onClick={() => shift(1)} style={{ background:"none", border:"none", color:COLORS.text, cursor:"pointer" }}><ChevronLeft size={20} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <StatBox label="إجمالي الأرباح" value={profit} color={COLORS.green} />
        <StatBox label="إجمالي المصروف" value={expense} color={COLORS.red} />
        <StatBox label="إجمالي الديون" value={debt} color={COLORS.orange} />
        <StatBox label="إجمالي التيبس" value={tips} color={COLORS.purple} />
        <StatBox label="مرتب للشركة" value={dueToCompany} color={COLORS.yellow} />
      </div>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 6 }}>الربح الصافي (أرباح - مصروف)</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: net>=0?COLORS.green:COLORS.red }}>${fmt(net)}</div>
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "30px 0", fontSize: 14 }}>لا توجد عمليات في هذه الفترة</div>}
    </div>
  );
}

function SettingsScreen({ data, persist, onBack, showToast }) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(data.exchangeRate.toString());
  const saveRate = () => { const r=parseFloat(rateInput); if(r>0){persist((prev)=>({...prev,exchangeRate:r}));} setEditingRate(false); };
  const recalcAll = () => {
    persist((prev) => ({ ...prev, entries: prev.entries.map((e) => {
      if(e.type!=="order") return e;
      const rate=prev.exchangeRate||1;
      const orderValueTotalUSD=(e.orderValueUSD||0)+(e.orderValueLBP||0)/rate;
      const profitTotalUSD=(e.profitUSD||0)+(e.profitLBP||0)/rate;
      const dueToCompanyUSD=orderValueTotalUSD-profitTotalUSD;
      const paidTotalUSD=(e.paidUSD||0)+(e.paidLBP||0)/rate;
      const tipsTotalUSD=paidTotalUSD-profitTotalUSD-dueToCompanyUSD;
      return {...e,orderValueTotalUSD,profitTotalUSD,dueToCompanyUSD,paidTotalUSD,tipsUSD:tipsTotalUSD,tipsLBP:tipsTotalUSD*rate,tipsTotalUSD};
    })}));
    showToast("تم تحديث كل العمليات");
  };
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>الإعدادات</div>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>سعر صرف الدولار</div>
        {editingRate ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="number" value={rateInput} onChange={(e) => setRateInput(e.target.value)} autoFocus />
            <button onClick={saveRate} style={{ background: COLORS.green, border: "none", borderRadius: 10, padding: "0 16px", color: "#fff", cursor: "pointer" }}><Check size={18} /></button>
          </div>
        ) : (
          <button onClick={() => { setRateInput(data.exchangeRate.toString()); setEditingRate(true); }} style={{ display: "flex", justifyContent: "space-between", width: "100%", background: COLORS.bgCard2, border: "none", borderRadius: 10, padding: "12px 14px", color: COLORS.text, cursor: "pointer", fontSize: 15 }}>
            <span>1$ = {fmtLBP(data.exchangeRate)} ل.ل</span>
            <Edit3 size={16} color={COLORS.textDim} />
          </button>
        )}
      </div>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>إعادة حساب كل العمليات</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 12, lineHeight: 1.6 }}>يحدّث التيبس والمرتب لكل العمليات القديمة بسعر الصرف الحالي.</div>
        <button onClick={recalcAll} style={{ width: "100%", background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px", color: COLORS.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, cursor: "pointer" }}><RefreshCw size={16} /> إعادة حساب الآن</button>
      </div>
      <div style={{ background: "#1a2230", border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>ملاحظات مهمة</div>
        • البيانات تُحفظ محلياً على هذا الجهاز تلقائياً<br />
        • يمكنك تغيير سعر الصرف في أي وقت من هنا<br />
        • تسكير الحساب لا يحذف البيانات، فقط يحفظ نسخة من الملخص
      </div>
    </div>
  );
}
