import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home, BarChart3, Settings, Plus, ChevronLeft, ShoppingBag,
  HandCoins, Banknote, ArrowLeftRight, X, Trash2,
  ChevronRight as ChevronRightIcon, Edit3, Check, RefreshCw,
  Eye, EyeOff, Users, TrendingUp, TrendingDown, Wallet
} from "lucide-react";

const COLORS = {
  bg: "#0f1117", bgCard: "#1a1d27", bgCard2: "#21253a",
  border: "#2a2f45", green: "#00c896", greenDim: "#00a07a",
  orange: "#ff8c42", blue: "#4f8ef7", red: "#ff4d6d",
  purple: "#b06cf3", yellow: "#ffd166", teal: "#06d6a0",
  text: "#f0f2ff", textDim: "#8b90b0", textFaint: "#5a5f7a",
};

const COMPANY_COLORS = ["#ff4d6d","#4f8ef7","#00c896","#ff8c42","#b06cf3","#ffd166","#06d6a0","#f72585"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (n, d = 2) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtLBP = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const STORAGE_KEY = "delivery_v2_data";

const DEFAULT_DATA = {
  exchangeRate: 89000,
  balanceUSD: 0,
  balanceLBP: 0,
  companies: [],
  orders: [],
  expenses: [],
  personalDebts: [],
  auth: { pin: "1234" },
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch { return DEFAULT_DATA; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// مكونات مساعدة
function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", position: "sticky", top: 0, background: COLORS.bg, zIndex: 10, borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ width: 36 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", padding: 6 }}><ChevronRightIcon size={24} /></button>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{title}</div>
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

const inputStyle = {
  width: "100%", background: COLORS.bgCard2, border: `1px solid ${COLORS.border}`,
  borderRadius: 12, padding: "13px 14px", color: COLORS.text, fontSize: 16,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

function SaveBtn({ onClick, label = "حفظ", color = COLORS.green, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", background: disabled ? COLORS.textFaint : color, border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontSize: 17, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", marginTop: 8 }}>
      {label}
    </button>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: COLORS.textDim }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || COLORS.text }}>{value}</span>
    </div>
  );
}

function CurrencyToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10, background: COLORS.bgCard2, borderRadius: 10, padding: 4 }}>
      <button onClick={() => onChange("usd")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontWeight: 700, cursor: "pointer", background: value === "usd" ? COLORS.green : "transparent", color: value === "usd" ? "#fff" : COLORS.textDim, fontSize: 13 }}>$ دولار</button>
      <button onClick={() => onChange("lbp")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontWeight: 700, cursor: "pointer", background: value === "lbp" ? COLORS.blue : "transparent", color: value === "lbp" ? "#fff" : COLORS.textDim, fontSize: 13 }}>ل.ل ليرة</button>
    </div>
  );
}

function AmountInput({ currency, value, onChange, placeholder = "0" }) {
  return (
    <div style={{ position: "relative" }}>
      <input style={{ ...inputStyle, paddingInlineStart: currency === "usd" ? 28 : 14, paddingInlineEnd: currency === "lbp" ? 60 : 14 }}
        type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {currency === "usd" && <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textDim, fontWeight: 700 }}>$</span>}
      {currency === "lbp" && <span style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textDim, fontSize: 12, fontWeight: 700 }}>ألف ل.ل</span>}
      {currency === "lbp" && value && <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 4 }}>= {fmtLBP((parseFloat(value)||0)*1000)} ل.ل</div>}
    </div>
  );
 // شاشة السبلاش
function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1d27 50%, ${COLORS.bg} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ width: 100, height: 100, borderRadius: 28, background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, boxShadow: `0 20px 60px ${COLORS.green}40` }}>🛵</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.text }}>دليفري بزنس</div>
        <div style={{ fontSize: 14, color: COLORS.textDim, marginTop: 6 }}>إدارة مالية شاملة ومبسطة</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {[0,1,2].map((i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 99, background: i === 1 ? COLORS.green : COLORS.border }} />
        ))}
      </div>
    </div>
  );
}

// شاشة PIN
function PinScreen({ onSuccess, pin }) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  const handleKey = (k) => {
    if (k === "del") { setEntered(p => p.slice(0, -1)); setError(false); return; }
    if (entered.length >= 4) return;
    const next = entered + k;
    setEntered(next);
    if (next.length === 4) {
      if (next === pin) { onSuccess(); }
      else { setError(true); setTimeout(() => { setEntered(""); setError(false); }, 600); }
    }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 24, boxShadow: `0 10px 30px ${COLORS.green}40` }}>🛵</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 6 }}>دليفري بزنس</div>
      <div style={{ fontSize: 14, color: COLORS.textDim, marginBottom: 32 }}>أدخل رمز PIN للدخول</div>

      {/* نقاط PIN */}
      <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 99, background: error ? COLORS.red : entered.length > i ? COLORS.green : COLORS.border, transition: "all 0.2s", transform: error ? "scale(1.3)" : "scale(1)" }} />
        ))}
      </div>

      {/* لوحة الأرقام */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 280 }}>
        {keys.map((k, i) => (
          k === "" ? <div key={i} /> :
          <button key={i} onClick={() => handleKey(k)} style={{ background: k === "del" ? COLORS.bgCard2 : COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "18px 0", color: COLORS.text, fontSize: k === "del" ? 18 : 24, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>
    </div>
  );
}

// التطبيق الرئيسي
export default function DeliveryApp() {
  const [data, setData] = useState(() => loadData());
  const [splash, setSplash] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState("home");
  const [subScreen, setSubScreen] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { const t = setTimeout(() => setSplash(false), 2000); return () => clearTimeout(t); }, []);

  const persist = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  const showToast = (msg, color = COLORS.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2000);
  };

  const rate = data.exchangeRate || 89000;

  if (splash) return <SplashScreen />;
  if (!loggedIn) return <PinScreen onSuccess={() => setLoggedIn(true)} pin={data.auth?.pin || "1234"} />;

  const showNav = ["home", "orders", "expenses", "debts", "settings"].includes(screen) && !subScreen;

  const goTo = (s, sub = null) => { setScreen(s); setSubScreen(sub); setEditingItem(null); };

  let content;

  if (screen === "home") {
    content = <HomeScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} />;
  } else if (screen === "orders") {
    if (subScreen === "add" || subScreen === "edit") {
      content = <OrderForm data={data} persist={persist} showToast={showToast} editing={editingItem} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else {
      content = <OrdersScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onEdit={(item) => { setEditingItem(item); setSubScreen("edit"); }} />;
    }
  } else if (screen === "expenses") {
    if (subScreen === "add" || subScreen === "edit") {
      content = <ExpenseForm data={data} persist={persist} showToast={showToast} editing={editingItem} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else {
      content = <ExpensesScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onEdit={(item) => { setEditingItem(item); setSubScreen("edit"); }} />;
    }
  } else if (screen === "debts") {
    if (subScreen === "add" || subScreen === "edit") {
      content = <DebtForm data={data} persist={persist} showToast={showToast} editing={editingItem} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else if (subScreen === "pay") {
      content = <PayDebtScreen debt={editingItem} persist={persist} showToast={showToast} onBack={() => { setSubScreen(null); setEditingItem(null); }} />;
    } else {
      content = <DebtsScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onEdit={(item) => { setEditingItem(item); setSubScreen("edit"); }} onPay={(item) => { setEditingItem(item); setSubScreen("pay"); }} />;
    }
  } else if (screen === "settings") {
    content = <SettingsScreen data={data} persist={persist} showToast={showToast} onLogout={() => setLoggedIn(false)} rate={rate} />;
  }

  return (
    <div dir="rtl" style={{ height: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", color: COLORS.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", minHeight: 0 }}>
        {content}
        <div style={{ height: 20 }} />
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: showNav ? 90 : 20, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", padding: "10px 24px", borderRadius: 30, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 200, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
      {showNav && <BottomNav screen={screen} setScreen={(s) => { setScreen(s); setSubScreen(null); setEditingItem(null); }} />}
    </div>
  );
}

function BottomNav({ screen, setScreen }) {
  const items = [
    { key: "settings", label: "الإعدادات", icon: Settings },
    { key: "debts", label: "الديون", icon: Users },
    { key: "home", label: "الرئيسية", icon: Home },
    { key: "expenses", label: "المصروفات", icon: Banknote },
    { key: "orders", label: "الطلبات", icon: ShoppingBag },
  ];
  return (
    <div style={{ flexShrink: 0, background: COLORS.bgCard, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 calc(10px + env(safe-area-inset-bottom))", zIndex: 50 }}>
      {items.map((it) => {
        const active = screen === it.key;
        const Icon = it.icon;
        return (
          <button key={it.key} onClick={() => setScreen(it.key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? COLORS.green : COLORS.textFaint, cursor: "pointer", padding: "4px 8px" }}>
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: 700 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
      }function HomeScreen({ data, persist, showToast, goTo, rate }) {
  const todayStr = new Date().toDateString();

  // حساب الإجماليات
  const todayOrders = data.orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const todayProfitUSD = todayOrders.reduce((s, o) => s + (o.currency === "usd" ? o.profit : 0), 0);
  const todayProfitLBP = todayOrders.reduce((s, o) => s + (o.currency === "lbp" ? o.profit * 1000 : 0), 0);

  const allOrders = data.orders || [];
  const totalDueUSD = allOrders.filter(o => o.currency === "usd").reduce((s, o) => s + (o.dueToCompany || 0), 0);
  const totalDueLBP = allOrders.filter(o => o.currency === "lbp").reduce((s, o) => s + (o.dueToCompany || 0) * 1000, 0);
  const totalTipsUSD = allOrders.filter(o => o.currency === "usd").reduce((s, o) => s + (o.tips || 0), 0);
  const totalTipsLBP = allOrders.filter(o => o.currency === "lbp").reduce((s, o) => s + (o.tips || 0) * 1000, 0);

  const totalExpensesUSD = (data.expenses || []).filter(e => e.currency === "usd").reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpensesLBP = (data.expenses || []).filter(e => e.currency === "lbp").reduce((s, e) => s + (e.amount || 0) * 1000, 0);

  const personalDebts = data.personalDebts || [];
  const debtOwedToMeUSD = personalDebts.filter(d => d.direction === "owedToMe" && d.currency === "usd").reduce((s, d) => { const paid = (d.payments||[]).reduce((a,p) => a + (p.amount||0), 0); return s + Math.max(0, d.amount - paid); }, 0);
  const debtOwedByMeUSD = personalDebts.filter(d => d.direction === "owedByMe" && d.currency === "usd").reduce((s, d) => { const paid = (d.payments||[]).reduce((a,p) => a + (p.amount||0), 0); return s + Math.max(0, d.amount - paid); }, 0);
  const debtOwedToMeLBP = personalDebts.filter(d => d.direction === "owedToMe" && d.currency === "lbp").reduce((s, d) => { const paid = (d.payments||[]).reduce((a,p) => a + (p.amount||0), 0); return s + Math.max(0, d.amount - paid) * 1000; }, 0);
  const debtOwedByMeLBP = personalDebts.filter(d => d.direction === "owedByMe" && d.currency === "lbp").reduce((s, d) => { const paid = (d.payments||[]).reduce((a,p) => a + (p.amount||0), 0); return s + Math.max(0, d.amount - paid) * 1000; }, 0);

  // الرصيد الكلي
  const balanceUSD = (data.balanceUSD || 0);
  const balanceLBP = (data.balanceLBP || 0);

  // آخر العمليات
  const allOps = [
    ...(data.orders||[]).map(o => ({ ...o, _type: "order" })),
    ...(data.expenses||[]).map(e => ({ ...e, _type: "expense" })),
    ...(data.personalDebts||[]).map(d => ({ ...d, _type: "debt" })),
  ].sort((a,b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div style={{ padding: "0 0 16px" }}>
      {/* الهيدر */}
      <div style={{ background: `linear-gradient(135deg, #1a1d27 0%, #21253a 100%)`, padding: "20px 16px 24px", marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.textDim, fontWeight: 600 }}>الرصيد الكلي</div>
            <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>سعر الصرف: 1$ = {fmtLBP(rate)} ل.ل</div>
          </div>
          <div style={{ fontSize: 28 }}>🛵</div>
        </div>

        {/* الرصيد */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "rgba(0,200,150,0.15)", border: `1px solid ${COLORS.green}40`, borderRadius: 16, padding: "14px 12px" }}>
            <div style={{ color: COLORS.green, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>$ بالدولار</div>
            <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 800 }}>${fmt(balanceUSD)}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(79,142,247,0.15)", border: `1px solid ${COLORS.blue}40`, borderRadius: 16, padding: "14px 12px" }}>
            <div style={{ color: COLORS.blue, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>ل.ل بالليرة</div>
            <div style={{ color: COLORS.text, fontSize: 18, fontWeight: 800 }}>{fmtLBP(balanceLBP)}</div>
          </div>
        </div>

        {/* بطاقة اليوم */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.green}20, ${COLORS.blue}20)`, border: `1px solid ${COLORS.green}30`, borderRadius: 16, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4 }}>أرباح اليوم</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.green }}>${fmt(todayProfitUSD)}</div>
            {todayProfitLBP > 0 && <div style={{ fontSize: 13, color: COLORS.blue, marginTop: 2 }}>{fmtLBP(todayProfitLBP)} ل.ل</div>}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: COLORS.textFaint }}>طلبات اليوم</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text }}>{todayOrders.length}</div>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <StatCard label="مترتب للشركة $" value={`$${fmt(totalDueUSD)}`} color={COLORS.orange} sub={totalDueLBP > 0 ? `${fmtLBP(totalDueLBP)} ل.ل` : null} onClick={() => goTo("orders")} />
          <StatCard label="إجمالي التيبس" value={`$${fmt(totalTipsUSD)}`} color={COLORS.purple} sub={totalTipsLBP > 0 ? `${fmtLBP(totalTipsLBP)} ل.ل` : null} onClick={() => goTo("orders")} />
          <StatCard label="المصروفات $" value={`$${fmt(totalExpensesUSD)}`} color={COLORS.red} sub={totalExpensesLBP > 0 ? `${fmtLBP(totalExpensesLBP)} ل.ل` : null} onClick={() => goTo("expenses")} />
          <StatCard label="ديون لي" value={`$${fmt(debtOwedToMeUSD)}`} color={COLORS.green} sub={debtOwedToMeLBP > 0 ? `${fmtLBP(debtOwedToMeLBP)} ل.ل` : null} onClick={() => goTo("debts")} />
        </div>

        {/* أزرار سريعة */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <QuickBtn icon="📦" label="طلب جديد" color={COLORS.green} onClick={() => goTo("orders", "add")} />
          <QuickBtn icon="💸" label="مصروف جديد" color={COLORS.red} onClick={() => goTo("expenses", "add")} />
          <QuickBtn icon="🔄" label="تحويل عملة" color={COLORS.blue} onClick={() => goTo("settings")} />
          <QuickBtn icon="👥" label="دين شخصي" color={COLORS.orange} onClick={() => goTo("debts", "add")} />
        </div>

        {/* آخر العمليات */}
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>آخر العمليات</div>
        {allOps.length === 0 && <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "30px 0" }}>لا توجد عمليات بعد</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allOps.map((op) => <RecentOpRow key={op.id} op={op} />)}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub, onClick }) {
  return (
    <div onClick={onClick} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer" }}>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function QuickBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 14, padding: "14px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{label}</span>
    </button>
  );
}

function RecentOpRow({ op }) {
  const isOrder = op._type === "order";
  const isExpense = op._type === "expense";
  const isDebt = op._type === "debt";

  const icon = isOrder ? "📦" : isExpense ? "💸" : op.direction === "owedToMe" ? "💰" : "👤";
  const label = isOrder ? `طلب — ${op.companyName || ""}` : isExpense ? `مصروف — ${op.category || ""}` : isDebt ? `دين — ${op.name}` : "";
  const amountStr = isOrder
    ? op.currency === "usd" ? `+$${fmt(op.profit)}` : `+${fmtLBP(op.profit * 1000)} ل.ل`
    : isExpense
    ? op.currency === "usd" ? `-$${fmt(op.amount)}` : `-${fmtLBP(op.amount * 1000)} ل.ل`
    : op.direction === "owedToMe"
    ? op.currency === "usd" ? `+$${fmt(op.amount)}` : `+${fmtLBP(op.amount * 1000)} ل.ل`
    : op.currency === "usd" ? `-$${fmt(op.amount)}` : `-${fmtLBP(op.amount * 1000)} ل.ل`;

  const amtColor = amountStr.startsWith("+") ? COLORS.green : COLORS.red;
  const dt = new Date(op.createdAt);
  const timeStr = dt.toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dt.toLocaleDateString("ar-LB", { day: "2-digit", month: "2-digit" });

  return (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>{dateStr} · {timeStr}</div>
        </div>
      </div>
      <div style={{ fontWeight: 800, color: amtColor, fontSize: 14 }}>{amountStr}</div>
    </div>
  );
                                                                                                                                  }function OrdersScreen({ data, persist, showToast, goTo, rate, onEdit }) {
  const [filter, setFilter] = useState("all");
  const orders = data.orders || [];

  const filtered = useMemo(() => {
    const today = new Date().toDateString();
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    if (filter === "today") return orders.filter(o => new Date(o.createdAt).toDateString() === today);
    if (filter === "week") return orders.filter(o => o.createdAt >= week);
    if (filter === "month") return orders.filter(o => o.createdAt >= month.getTime());
    return orders;
  }, [orders, filter]);

  const totalProfitUSD = filtered.filter(o => o.currency === "usd").reduce((s,o) => s + (o.profit||0), 0);
  const totalProfitLBP = filtered.filter(o => o.currency === "lbp").reduce((s,o) => s + (o.profit||0)*1000, 0);
  const totalDueUSD = filtered.filter(o => o.currency === "usd").reduce((s,o) => s + (o.dueToCompany||0), 0);
  const totalDueLBP = filtered.filter(o => o.currency === "lbp").reduce((s,o) => s + (o.dueToCompany||0)*1000, 0);
  const totalTipsUSD = filtered.filter(o => o.currency === "usd").reduce((s,o) => s + (o.tips||0), 0);
  const totalTipsLBP = filtered.filter(o => o.currency === "lbp").reduce((s,o) => s + (o.tips||0)*1000, 0);

  const deleteOrder = (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    persist((prev) => {
      const newBalanceUSD = order.currency === "usd" ? (prev.balanceUSD||0) - (order.profit||0) : prev.balanceUSD||0;
      const newBalanceLBP = order.currency === "lbp" ? (prev.balanceLBP||0) - (order.profit||0)*1000 : prev.balanceLBP||0;
      return { ...prev, orders: prev.orders.filter(o => o.id !== id), balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });
    showToast("تم حذف الطلب");
  };

  return (
    <div>
      <TopBar title="الطلبات" right={
        <button onClick={() => goTo("orders", "add")} style={{ background: COLORS.green, border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ جديد</button>
      } />
      <div style={{ padding: "0 16px" }}>
        {/* فلتر */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: COLORS.bgCard2, borderRadius: 12, padding: 4 }}>
          {[{k:"all",l:"الكل"},{k:"today",l:"اليوم"},{k:"week",l:"الأسبوع"},{k:"month",l:"الشهر"}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: filter===f.k ? COLORS.green : "transparent", color: filter===f.k ? "#fff" : COLORS.textDim }}>{f.l}</button>
          ))}
        </div>

        {/* ملخص */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: COLORS.textDim }}>ملخص الفترة</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>الأرباح $</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.green }}>${fmt(totalProfitUSD)}</div>
              {totalProfitLBP > 0 && <div style={{ fontSize: 10, color: COLORS.blue }}>{fmtLBP(totalProfitLBP)} ل.ل</div>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>مترتب للشركة</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.orange }}>${fmt(totalDueUSD)}</div>
              {totalDueLBP > 0 && <div style={{ fontSize: 10, color: COLORS.blue }}>{fmtLBP(totalDueLBP)} ل.ل</div>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>التيبس</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.purple }}>${fmt(totalTipsUSD)}</div>
              {totalTipsLBP > 0 && <div style={{ fontSize: 10, color: COLORS.blue }}>{fmtLBP(totalTipsLBP)} ل.ل</div>}
            </div>
          </div>
        </div>

        {/* القائمة */}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: COLORS.textFaint, padding: "40px 0" }}>لا توجد طلبات</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...filtered].sort((a,b) => b.createdAt - a.createdAt).map(order => (
            <OrderCard key={order.id} order={order} onDelete={() => deleteOrder(order.id)} onEdit={() => onEdit(order)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const isUSD = order.currency === "usd";
  const sym = isUSD ? "$" : "";
  const suf = isUSD ? "" : " ألف ل.ل";
  const dt = new Date(order.createdAt);

  return (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${COLORS.green}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{order.companyName || "طلب"} {order.orderNumber ? `#${order.orderNumber}` : ""}</div>
            <div style={{ fontSize: 11, color: COLORS.textFaint }}>{dt.toLocaleDateString("ar-LB")} · {dt.toLocaleTimeString("ar-LB", {hour:"2-digit",minute:"2-digit"})}</div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 800, color: COLORS.green, fontSize: 15 }}>{isUSD ? `+$${fmt(order.profit)}` : `+${fmt(order.profit)} ألف ل.ل`}</div>
          <div style={{ fontSize: 11, color: COLORS.textFaint }}>ربح</div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <Row label="قيمة الطلب" value={`${sym}${fmt(order.orderValue)}${suf}`} />
          <Row label="الربح" value={`${sym}${fmt(order.profit)}${suf}`} valueColor={COLORS.green} />
          <Row label="مترتب للشركة" value={`${sym}${fmt(order.dueToCompany)}${suf}`} valueColor={COLORS.orange} />
          <Row label="المقبوض $" value={`$${fmt(order.collectedUSD||0)}`} />
          {(order.collectedLBP||0) > 0 && <Row label="المقبوض ل.ل" value={`${fmtLBP((order.collectedLBP||0)*1000)} ل.ل`} />}
          <Row label="التيبس" value={isUSD ? `$${fmt(order.tips||0)}` : `${fmt(order.tips||0)} ألف ل.ل`} valueColor={COLORS.purple} />
          {order.note && <Row label="ملاحظات" value={order.note} />}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button onClick={onEdit} style={{ background: "none", border: "none", color: COLORS.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={14} /> تعديل</button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={14} /> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderForm({ data, persist, showToast, editing, onBack, rate }) {
  const e = editing;
  const [currency, setCurrency] = useState(e?.currency || "usd");
  const [companyName, setCompanyName] = useState(e?.companyName || "");
  const [orderNumber, setOrderNumber] = useState(e?.orderNumber || "");
  const [orderValue, setOrderValue] = useState(e ? String(e.orderValue||"") : "");
  const [profit, setProfit] = useState(e ? String(e.profit||"") : "");
  const [collectedUSD, setCollectedUSD] = useState(e ? String(e.collectedUSD||"") : "");
  const [collectedLBP, setCollectedLBP] = useState(e ? String(e.collectedLBP||"") : "");
  const [note, setNote] = useState(e?.note || "");

  const ov = parseFloat(orderValue) || 0;
  const pr = parseFloat(profit) || 0;
  const dueToCompany = Math.max(0, ov - pr);

  // حساب التيبس
  let tips = 0;
  if (currency === "usd") {
    const colUSD = parseFloat(collectedUSD) || 0;
    const colLBP = (parseFloat(collectedLBP) || 0) * 1000 / rate;
    const totalCollected = colUSD + colLBP;
    tips = Math.max(0, totalCollected - dueToCompany - pr);
  } else {
    const colUSD = (parseFloat(collectedUSD) || 0) * rate / 1000;
    const colLBP = parseFloat(collectedLBP) || 0;
    const totalCollected = colUSD + colLBP;
    tips = Math.max(0, totalCollected - dueToCompany - pr);
  }

  const valid = ov > 0 && pr >= 0;

  const save = () => {
    const order = {
      id: e ? e.id : uid(),
      currency,
      companyName: companyName.trim(),
      orderNumber: orderNumber.trim(),
      orderValue: ov,
      profit: pr,
      dueToCompany,
      collectedUSD: parseFloat(collectedUSD) || 0,
      collectedLBP: parseFloat(collectedLBP) || 0,
      tips,
      note: note.trim(),
      createdAt: e ? e.createdAt : Date.now(),
    };

    persist((prev) => {
      let newBalanceUSD = prev.balanceUSD || 0;
      let newBalanceLBP = prev.balanceLBP || 0;

      // إذا تعديل، نرجع القيمة القديمة أولاً
      if (e) {
        if (e.currency === "usd") newBalanceUSD -= e.profit || 0;
        else newBalanceLBP -= (e.profit || 0) * 1000;
      }

      // نضيف الجديد
      if (currency === "usd") newBalanceUSD += pr;
      else newBalanceLBP += pr * 1000;

      const orders = e
        ? prev.orders.map(o => o.id === e.id ? order : o)
        : [...(prev.orders||[]), order];

      return { ...prev, orders, balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });

    showToast(e ? "تم تعديل الطلب ✓" : "تم حفظ الطلب ✓");
    onBack();
  };

  return (
    <div>
      <TopBar title={e ? "تعديل الطلب" : "إدخال طلب جديد"} onBack={onBack} />
      <div style={{ padding: "0 16px" }}>

        {/* اختيار العملة */}
        <Field label="عملة الطلب">
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </Field>

        {/* ملخص الطلب */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 12, fontWeight: 700 }}>ملخص الطلب التلقائي</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center", background: `${COLORS.orange}15`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>مترتب للشركة</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.orange }}>{currency==="usd"?`$${fmt(dueToCompany)}`:`${fmt(dueToCompany)} ألف`}</div>
            </div>
            <div style={{ textAlign: "center", background: `${COLORS.green}15`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>ربحك</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.green }}>{currency==="usd"?`$${fmt(pr)}`:`${fmt(pr)} ألف`}</div>
            </div>
            <div style={{ textAlign: "center", background: `${COLORS.purple}15`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>التيبس</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.purple }}>{currency==="usd"?`$${fmt(tips)}`:`${fmt(tips)} ألف`}</div>
            </div>
          </div>
        </div>

        <Field label="اسم الشركة (اختياري)">
          <input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="مثال: Godzilla" />
        </Field>

        <Field label="رقم الطلب (اختياري)">
          <input style={inputStyle} value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="#1258" />
        </Field>

        <Field label={currency==="usd" ? "قيمة الطلب ($)" : "قيمة الطلب (ألف ل.ل)"}>
          <AmountInput currency={currency} value={orderValue} onChange={setOrderValue} />
        </Field>

        <Field label={currency==="usd" ? "ربحك ($)" : "ربحك (ألف ل.ل)"}>
          <AmountInput currency={currency} value={profit} onChange={setProfit} />
        </Field>

        <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 8, fontWeight: 600 }}>المقبوض من الزبون</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 6 }}>بالدولار $</div>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingInlineStart: 24 }} type="number" inputMode="decimal" value={collectedUSD} onChange={e => setCollectedUSD(e.target.value)} placeholder="0" />
              <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textDim, fontWeight: 700, fontSize: 14 }}>$</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 6 }}>بالليرة (ألف)</div>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingInlineEnd: 50 }} type="number" inputMode="decimal" value={collectedLBP} onChange={e => setCollectedLBP(e.target.value)} placeholder="0" />
              <span style={{ position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)", color: COLORS.textDim, fontSize: 11, fontWeight: 700 }}>ألف</span>
            </div>
            {collectedLBP && <div style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 3 }}>= {fmtLBP((parseFloat(collectedLBP)||0)*1000)} ل.ل</div>}
          </div>
        </div>

        <Field label="ملاحظات (اختياري)">
          <input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات..." />
        </Field>

        <SaveBtn disabled={!valid} onClick={save} label={e ? "حفظ التعديلات" : "حفظ الطلب"} />
      </div>
    </div>
  );
}function ExpensesScreen({ data, persist, showToast, goTo, rate, onEdit }) {
  const [filter, setFilter] = useState("all");
  const expenses = data.expenses || [];

  const filtered = useMemo(() => {
    const today = new Date().toDateString();
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    if (filter === "today") return expenses.filter(e => new Date(e.createdAt).toDateString() === today);
    if (filter === "week") return expenses.filter(e => e.createdAt >= week);
    if (filter === "month") return expenses.filter(e => e.createdAt >= month.getTime());
    return expenses;
  }, [expenses, filter]);

  const totalUSD = filtered.filter(e => e.currency === "usd").reduce((s,e) => s + (e.amount||0), 0);
  const totalLBP = filtered.filter(e => e.currency === "lbp").reduce((s,e) => s + (e.amount||0)*1000, 0);

  const deleteExpense = (id) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    persist((prev) => {
      const newBalanceUSD = exp.currency === "usd" ? (prev.balanceUSD||0) + (exp.amount||0) : prev.balanceUSD||0;
      const newBalanceLBP = exp.currency === "lbp" ? (prev.balanceLBP||0) + (exp.amount||0)*1000 : prev.balanceLBP||0;
      return { ...prev, expenses: prev.expenses.filter(e => e.id !== id), balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });
    showToast("تم حذف المصروف");
  };

  return (
    <div>
      <TopBar title="المصروفات" right={
        <button onClick={() => goTo("expenses","add")} style={{ background: COLORS.red, border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ جديد</button>
      } />
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: COLORS.bgCard2, borderRadius: 12, padding: 4 }}>
          {[{k:"all",l:"الكل"},{k:"today",l:"اليوم"},{k:"week",l:"الأسبوع"},{k:"month",l:"الشهر"}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{ flex:1, padding:"8px 4px", borderRadius:9, border:"none", fontWeight:700, fontSize:12, cursor:"pointer", background:filter===f.k?COLORS.red:"transparent", color:filter===f.k?"#fff":COLORS.textDim }}>{f.l}</button>
          ))}
        </div>

        <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:4 }}>إجمالي المصروفات</div>
            <div style={{ fontSize:22, fontWeight:800, color:COLORS.red }}>${fmt(totalUSD)}</div>
            {totalLBP > 0 && <div style={{ fontSize:13, color:COLORS.blue, marginTop:2 }}>{fmtLBP(totalLBP)} ل.ل</div>}
          </div>
          <div style={{ fontSize:36 }}>💸</div>
        </div>

        {filtered.length === 0 && <div style={{ textAlign:"center", color:COLORS.textFaint, padding:"40px 0" }}>لا توجد مصروفات</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[...filtered].sort((a,b) => b.createdAt - a.createdAt).map(exp => (
            <ExpenseCard key={exp.id} expense={exp} onDelete={() => deleteExpense(exp.id)} onEdit={() => onEdit(exp)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpenseCard({ expense, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const isUSD = expense.currency === "usd";
  const dt = new Date(expense.createdAt);
  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
      <div onClick={() => setOpen(o=>!o)} style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${COLORS.red}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💸</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{expense.category || "مصروف"}</div>
            <div style={{ fontSize:11, color:COLORS.textFaint }}>{dt.toLocaleDateString("ar-LB")} · {dt.toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})}</div>
          </div>
        </div>
        <div style={{ fontWeight:800, color:COLORS.red, fontSize:15 }}>
          {isUSD ? `-$${fmt(expense.amount)}` : `-${fmt(expense.amount)} ألف ل.ل`}
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          <Row label="النوع" value={expense.category||""} />
          <Row label="المبلغ" value={isUSD ? `$${fmt(expense.amount)}` : `${fmt(expense.amount)} ألف ل.ل`} valueColor={COLORS.red} />
          {expense.note && <Row label="ملاحظات" value={expense.note} />}
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={onEdit} style={{ background:"none", border:"none", color:COLORS.blue, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Edit3 size={14}/> تعديل</button>
            <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Trash2 size={14}/> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseForm({ data, persist, showToast, editing, onBack, rate }) {
  const e = editing;
  const [currency, setCurrency] = useState(e?.currency || "usd");
  const [amount, setAmount] = useState(e ? String(e.amount||"") : "");
  const [category, setCategory] = useState(e?.category || "");
  const [note, setNote] = useState(e?.note || "");

  const categories = ["بنزين","أكل","صيانة","إنترنت","كهرباء","إيجار","أخرى"];
  const valid = parseFloat(amount) > 0;

  const save = () => {
    const amt = parseFloat(amount) || 0;
    const expense = { id: e?e.id:uid(), currency, amount: amt, category: category.trim(), note: note.trim(), createdAt: e?e.createdAt:Date.now() };
    persist((prev) => {
      let newBalanceUSD = prev.balanceUSD || 0;
      let newBalanceLBP = prev.balanceLBP || 0;
      if (e) {
        if (e.currency === "usd") newBalanceUSD += e.amount || 0;
        else newBalanceLBP += (e.amount||0) * 1000;
      }
      if (currency === "usd") newBalanceUSD -= amt;
      else newBalanceLBP -= amt * 1000;
      const expenses = e ? prev.expenses.map(ex => ex.id===e.id ? expense : ex) : [...(prev.expenses||[]), expense];
      return { ...prev, expenses, balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });
    showToast(e ? "تم تعديل المصروف ✓" : "تم حفظ المصروف ✓");
    onBack();
  };

  return (
    <div>
      <TopBar title={e ? "تعديل المصروف" : "إضافة مصروف"} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <Field label="العملة"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
        <Field label={currency==="usd"?"المبلغ ($)":"المبلغ (ألف ل.ل)"}><AmountInput currency={currency} value={amount} onChange={setAmount} /></Field>
        <Field label="النوع / الفئة">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding:"8px 14px", borderRadius:20, border:`1px solid ${category===c?COLORS.red:COLORS.border}`, background:category===c?`${COLORS.red}20`:"transparent", color:category===c?COLORS.red:COLORS.textDim, fontWeight:600, fontSize:13, cursor:"pointer" }}>{c}</button>
            ))}
          </div>
          <input style={inputStyle} value={category} onChange={e=>setCategory(e.target.value)} placeholder="أو اكتب نوع مخصص..." />
        </Field>
        <Field label="ملاحظات (اختياري)"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظات..." /></Field>
        <SaveBtn disabled={!valid} onClick={save} color={COLORS.red} label={e?"حفظ التعديلات":"حفظ المصروف"} />
      </div>
    </div>
  );
}

// الديون الشخصية
function DebtsScreen({ data, persist, showToast, goTo, rate, onEdit, onPay }) {
  const debts = data.personalDebts || [];
  const owedToMe = debts.filter(d => d.direction === "owedToMe");
  const owedByMe = debts.filter(d => d.direction === "owedByMe");

  const totalOwedToMeUSD = owedToMe.filter(d=>d.currency==="usd").reduce((s,d) => { const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid); }, 0);
  const totalOwedByMeUSD = owedByMe.filter(d=>d.currency==="usd").reduce((s,d) => { const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid); }, 0);
  const totalOwedToMeLBP = owedToMe.filter(d=>d.currency==="lbp").reduce((s,d) => { const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid)*1000; }, 0);
  const totalOwedByMeLBP = owedByMe.filter(d=>d.currency==="lbp").reduce((s,d) => { const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid)*1000; }, 0);

  const deleteDebt = (id) => {
    persist((prev) => ({ ...prev, personalDebts: (prev.personalDebts||[]).filter(d=>d.id!==id) }));
    showToast("تم حذف الدين");
  };

  return (
    <div>
      <TopBar title="الديون الشخصية" right={
        <button onClick={() => goTo("debts","add")} style={{ background:COLORS.orange, border:"none", borderRadius:10, padding:"8px 12px", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>+ جديد</button>
      } />
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <div style={{ flex:1, background:`${COLORS.green}15`, border:`1px solid ${COLORS.green}30`, borderRadius:16, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ color:COLORS.green, fontSize:11, fontWeight:700, marginBottom:4 }}>💰 ديون لي</div>
            <div style={{ color:COLORS.text, fontSize:18, fontWeight:800 }}>${fmt(totalOwedToMeUSD)}</div>
            {totalOwedToMeLBP > 0 && <div style={{ fontSize:11, color:COLORS.blue }}>{fmtLBP(totalOwedToMeLBP)} ل.ل</div>}
          </div>
          <div style={{ flex:1, background:`${COLORS.red}15`, border:`1px solid ${COLORS.red}30`, borderRadius:16, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ color:COLORS.red, fontSize:11, fontWeight:700, marginBottom:4 }}>💸 ديون عليّ</div>
            <div style={{ color:COLORS.text, fontSize:18, fontWeight:800 }}>${fmt(totalOwedByMeUSD)}</div>
            {totalOwedByMeLBP > 0 && <div style={{ fontSize:11, color:COLORS.blue }}>{fmtLBP(totalOwedByMeLBP)} ل.ل</div>}
          </div>
        </div>

        <button onClick={() => goTo("debts","add")} style={{ width:"100%", background:`${COLORS.orange}20`, border:`1px solid ${COLORS.orange}40`, borderRadius:14, padding:"14px", color:COLORS.orange, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Plus size={18}/> إضافة دين شخصي
        </button>

        {owedToMe.length > 0 && (
          <>
            <div style={{ fontSize:14, fontWeight:800, color:COLORS.green, marginBottom:8 }}>💰 ديون لي</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {owedToMe.map(d => <DebtCard key={d.id} debt={d} onDelete={()=>deleteDebt(d.id)} onEdit={()=>onEdit(d)} onPay={()=>onPay(d)} />)}
            </div>
          </>
        )}

        {owedByMe.length > 0 && (
          <>
            <div style={{ fontSize:14, fontWeight:800, color:COLORS.red, marginBottom:8 }}>💸 ديون عليّ</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {owedByMe.map(d => <DebtCard key={d.id} debt={d} onDelete={()=>deleteDebt(d.id)} onEdit={()=>onEdit(d)} onPay={()=>onPay(d)} />)}
            </div>
          </>
        )}

        {debts.length === 0 && <div style={{ textAlign:"center", color:COLORS.textFaint, padding:"40px 0" }}>لا توجد ديون شخصية</div>}
      </div>
    </div>
  );
}

function DebtCard({ debt, onDelete, onEdit, onPay }) {
  const [open, setOpen] = useState(false);
  const isUSD = debt.currency === "usd";
  const paid = (debt.payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const remaining = Math.max(0, debt.amount - paid);
  const isSettled = remaining <= 0;
  const color = debt.direction === "owedToMe" ? COLORS.green : COLORS.red;

  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${isSettled?COLORS.green:COLORS.border}`, borderRadius:14, overflow:"hidden", opacity:isSettled?0.75:1 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${color}20`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:18, fontFamily:"inherit" }}>
            <div style={{ width:36, height:36, borderRadius:9, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800 }}>{debt.name.slice(0,1)}</div>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{debt.name}</div>
            <div style={{ fontSize:11, color:COLORS.textFaint }}>{isSettled?"✅ مسدّد":`متبقي: ${isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`}`}</div>
          </div>
        </div>
        <div style={{ fontWeight:800, color, fontSize:15 }}>{isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`}</div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          <Row label="المبلغ الكلي" value={isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`} valueColor={color} />
          <Row label="المدفوع" value={isUSD?`$${fmt(paid)}`:`${fmt(paid)} ألف ل.ل`} valueColor={COLORS.green} />
          <Row label="المتبقي" value={isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`} valueColor={remaining>0?COLORS.orange:COLORS.green} />
          {debt.note && <Row label="ملاحظة" value={debt.note} />}
          {(debt.payments||[]).length > 0 && (
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, fontWeight:700, color:COLORS.textDim, marginBottom:4 }}>الدفعات:</div>
              {debt.payments.map((p,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"2px 0" }}>
                  <span style={{ color:COLORS.textFaint }}>{new Date(p.date).toLocaleDateString("ar-LB")}</span>
                  <span style={{ color:COLORS.green, fontWeight:700 }}>{isUSD?`$${fmt(p.amount)}`:`${fmt(p.amount)} ألف ل.ل`}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            {!isSettled && <button onClick={onPay} style={{ flex:1, background:COLORS.blue, border:"none", borderRadius:8, padding:"9px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>تسديد دفعة</button>}
            <button onClick={onEdit} style={{ background:"none", border:"none", color:COLORS.blue, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Edit3 size={14}/> تعديل</button>
            <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Trash2 size={14}/> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DebtForm({ data, persist, showToast, editing, onBack, rate }) {
  const e = editing;
  const [currency, setCurrency] = useState(e?.currency||"usd");
  const [direction, setDirection] = useState(e?.direction||"owedToMe");
  const [name, setName] = useState(e?.name||"");
  const [amount, setAmount] = useState(e?String(e.amount||""):"");
  const [note, setNote] = useState(e?.note||"");

  const valid = name.trim() && parseFloat(amount) > 0;

  const save = () => {
    const amt = parseFloat(amount) || 0;
    const debt = { id:e?e.id:uid(), currency, direction, name:name.trim(), amount:amt, note:note.trim(), createdAt:e?e.createdAt:Date.now(), payments:e?e.payments:[] };

    persist((prev) => {
      let newBalanceUSD = prev.balanceUSD || 0;
      let newBalanceLBP = prev.balanceLBP || 0;

      if (e) {
        if (e.currency === "usd") {
          if (e.direction === "owedToMe") newBalanceUSD -= e.amount||0;
          else newBalanceUSD += e.amount||0;
        } else {
          if (e.direction === "owedToMe") newBalanceLBP -= (e.amount||0)*1000;
          else newBalanceLBP += (e.amount||0)*1000;
        }
      }

      if (currency === "usd") {
        if (direction === "owedToMe") newBalanceUSD += amt;
        else newBalanceUSD -= amt;
      } else {
        if (direction === "owedToMe") newBalanceLBP += amt*1000;
        else newBalanceLBP -= amt*1000;
      }

      const personalDebts = e
        ? prev.personalDebts.map(d=>d.id===e.id?debt:d)
        : [...(prev.personalDebts||[]), debt];

      return { ...prev, personalDebts, balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });

    showToast(e?"تم تعديل الدين ✓":"تم إضافة الدين ✓");
    onBack();
  };

  return (
    <div>
      <TopBar title={e?"تعديل الدين":"إضافة دين شخصي"} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <Field label="نوع الدين">
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setDirection("owedToMe")} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:direction==="owedToMe"?COLORS.green:COLORS.bgCard2, color:direction==="owedToMe"?"#fff":COLORS.textDim }}>💰 دين لي</button>
            <button onClick={()=>setDirection("owedByMe")} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:direction==="owedByMe"?COLORS.red:COLORS.bgCard2, color:direction==="owedByMe"?"#fff":COLORS.textDim }}>💸 دين عليّ</button>
          </div>
        </Field>
        <Field label="العملة"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
        <Field label="اسم الشخص"><input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: أحمد" autoFocus /></Field>
        <Field label={currency==="usd"?"المبلغ ($)":"المبلغ (ألف ل.ل)"}><AmountInput currency={currency} value={amount} onChange={setAmount} /></Field>
        <Field label="ملاحظة (اختياري)"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder="سبب الدين..." /></Field>

        <div style={{ background:direction==="owedToMe"?`${COLORS.green}10`:`${COLORS.red}10`, border:`1px solid ${direction==="owedToMe"?COLORS.green:COLORS.red}30`, borderRadius:12, padding:12, marginBottom:8 }}>
          <div style={{ fontSize:12, color:direction==="owedToMe"?COLORS.green:COLORS.red, fontWeight:700 }}>
            {direction==="owedToMe" ? "✓ سيُضاف إلى رصيدك الكلي" : "✓ سيُخصم من رصيدك الكلي"}
          </div>
        </div>

        <SaveBtn disabled={!valid} onClick={save} color={direction==="owedToMe"?COLORS.green:COLORS.red} label={e?"حفظ التعديلات":"إضافة الدين"} />
      </div>
    </div>
  );
}

function PayDebtScreen({ debt, persist, showToast, onBack }) {
  const [amount, setAmount] = useState("");
  const isUSD = debt.currency === "usd";
  const paid = (debt.payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const remaining = Math.max(0, debt.amount - paid);
  const valid = parseFloat(amount) > 0 && parseFloat(amount) <= remaining;

  const save = () => {
    const amt = parseFloat(amount)||0;
    persist((prev) => {
      let newBalanceUSD = prev.balanceUSD||0;
      let newBalanceLBP = prev.balanceLBP||0;

      if (debt.direction === "owedToMe") {
        if (isUSD) newBalanceUSD -= amt;
        else newBalanceLBP -= amt*1000;
      } else {
        if (isUSD) newBalanceUSD += amt;
        else newBalanceLBP += amt*1000;
      }

      return {
        ...prev,
        balanceUSD: newBalanceUSD,
        balanceLBP: newBalanceLBP,
        personalDebts: prev.personalDebts.map(d =>
          d.id === debt.id ? { ...d, payments: [...(d.payments||[]), { amount: amt, date: Date.now() }] } : d
        )
      };
    });
    showToast("تم تسجيل الدفعة ✓");
    onBack();
  };

  return (
    <div>
      <TopBar title={`تسديد — ${debt.name}`} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
          <Row label="المبلغ الكلي" value={isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`} />
          <div style={{ height:8 }} />
          <Row label="المدفوع سابقاً" value={isUSD?`$${fmt(paid)}`:`${fmt(paid)} ألف ل.ل`} valueColor={COLORS.green} />
          <div style={{ height:8 }} />
          <Row label="المتبقي" value={isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`} valueColor={COLORS.orange} />
        </div>
        <Field label={isUSD?"مبلغ الدفعة ($)":"مبلغ الدفعة (ألف ل.ل)"}>
          <AmountInput currency={debt.currency} value={amount} onChange={setAmount} />
        </Field>
        <SaveBtn disabled={!valid} onClick={save} color={COLORS.blue} label="تسجيل الدفعة" />
      </div>
    </div>
  );
      }function SettingsScreen({ data, persist, showToast, onLogout, rate }) {
  const [editingPin, setEditingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(data.exchangeRate || 89000));
  const [showConvert, setShowConvert] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertDir, setConvertDir] = useState("usd_to_lbp");

  const savePin = () => {
    if (newPin.length !== 4) { showToast("PIN لازم يكون 4 أرقام", COLORS.red); return; }
    if (newPin !== confirmPin) { showToast("PIN غير متطابق", COLORS.red); return; }
    persist((prev) => ({ ...prev, auth: { ...prev.auth, pin: newPin } }));
    showToast("تم تغيير PIN ✓");
    setEditingPin(false); setNewPin(""); setConfirmPin("");
  };

  const saveRate = () => {
    const r = parseFloat(rateInput);
    if (r > 0) { persist((prev) => ({ ...prev, exchangeRate: r })); showToast("تم تحديث سعر الصرف ✓"); }
    setEditingRate(false);
  };

  const amt = parseFloat(convertAmount) || 0;
  const convertResult = convertDir === "usd_to_lbp" ? amt * rate : amt * 1000 / rate;

  const confirmConvert = () => {
    if (amt <= 0) return;
    persist((prev) => {
      let newBalanceUSD = prev.balanceUSD || 0;
      let newBalanceLBP = prev.balanceLBP || 0;
      if (convertDir === "usd_to_lbp") {
        newBalanceUSD -= amt;
        newBalanceLBP += amt * rate;
      } else {
        newBalanceLBP -= amt * 1000;
        newBalanceUSD += amt * 1000 / rate;
      }
      return { ...prev, balanceUSD: newBalanceUSD, balanceLBP: newBalanceLBP };
    });
    showToast("تم التحويل ✓");
    setConvertAmount("");
  };

  // إحصائيات عامة
  const totalOrders = (data.orders||[]).length;
  const totalExpenses = (data.expenses||[]).length;
  const totalDebts = (data.personalDebts||[]).length;
  const totalProfitUSD = (data.orders||[]).filter(o=>o.currency==="usd").reduce((s,o)=>s+(o.profit||0),0);
  const totalProfitLBP = (data.orders||[]).filter(o=>o.currency==="lbp").reduce((s,o)=>s+(o.profit||0)*1000,0);
  const totalExpUSD = (data.expenses||[]).filter(e=>e.currency==="usd").reduce((s,e)=>s+(e.amount||0),0);
  const totalExpLBP = (data.expenses||[]).filter(e=>e.currency==="lbp").reduce((s,e)=>s+(e.amount||0)*1000,0);

  return (
    <div>
      <TopBar title="الإعدادات" />
      <div style={{ padding:"0 16px" }}>

        {/* الرصيد الحالي */}
        <div style={{ background:`linear-gradient(135deg, ${COLORS.bgCard}, ${COLORS.bgCard2})`, border:`1px solid ${COLORS.border}`, borderRadius:18, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, color:COLORS.textDim, fontWeight:700, marginBottom:12 }}>الرصيد الحالي</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, background:`${COLORS.green}15`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.green, fontWeight:700, marginBottom:4 }}>$ دولار</div>
              <div style={{ fontSize:18, fontWeight:800, color:COLORS.text }}>${fmt(data.balanceUSD||0)}</div>
            </div>
            <div style={{ flex:1, background:`${COLORS.blue}15`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.blue, fontWeight:700, marginBottom:4 }}>ل.ل ليرة</div>
              <div style={{ fontSize:15, fontWeight:800, color:COLORS.text }}>{fmtLBP(data.balanceLBP||0)}</div>
            </div>
          </div>
        </div>

        {/* تحويل العملة */}
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: showConvert?16:0 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>🔄 تحويل العملة</div>
            <button onClick={()=>setShowConvert(s=>!s)} style={{ background:`${COLORS.blue}20`, border:`1px solid ${COLORS.blue}40`, borderRadius:8, padding:"6px 12px", color:COLORS.blue, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {showConvert ? "إخفاء" : "فتح"}
            </button>
          </div>
          {showConvert && (
            <>
              <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:12, textAlign:"center" }}>1$ = {fmtLBP(rate)} ل.ل</div>
              <div style={{ display:"flex", gap:8, marginBottom:12, background:COLORS.bgCard2, borderRadius:10, padding:4 }}>
                <button onClick={()=>setConvertDir("usd_to_lbp")} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:convertDir==="usd_to_lbp"?COLORS.green:"transparent", color:convertDir==="usd_to_lbp"?"#fff":COLORS.textDim, fontSize:13 }}>$ → ل.ل</button>
                <button onClick={()=>setConvertDir("lbp_to_usd")} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:convertDir==="lbp_to_usd"?COLORS.blue:"transparent", color:convertDir==="lbp_to_usd"?"#fff":COLORS.textDim, fontSize:13 }}>ل.ل → $</button>
              </div>
              <Field label={convertDir==="usd_to_lbp"?"المبلغ بالدولار":"المبلغ بالليرة (ألف)"}>
                <input style={inputStyle} type="number" inputMode="decimal" value={convertAmount} onChange={e=>setConvertAmount(e.target.value)} placeholder="0" />
              </Field>
              {amt > 0 && (
                <div style={{ background:COLORS.bgCard2, borderRadius:12, padding:14, marginBottom:12, textAlign:"center" }}>
                  <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:6 }}>النتيجة</div>
                  <div style={{ fontSize:22, fontWeight:800, color:convertDir==="usd_to_lbp"?COLORS.blue:COLORS.green }}>
                    {convertDir==="usd_to_lbp" ? `${fmtLBP(convertResult)} ل.ل` : `$${fmt(convertResult)}`}
                  </div>
                </div>
              )}
              <SaveBtn onClick={confirmConvert} disabled={amt<=0} label="تأكيد التحويل" color={COLORS.blue} />
            </>
          )}
        </div>

        {/* سعر الصرف */}
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>💱 سعر الصرف</div>
          {editingRate ? (
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...inputStyle, flex:1 }} type="number" value={rateInput} onChange={e=>setRateInput(e.target.value)} autoFocus />
              <button onClick={saveRate} style={{ background:COLORS.green, border:"none", borderRadius:10, padding:"0 16px", color:"#fff", cursor:"pointer" }}><Check size={18}/></button>
              <button onClick={()=>setEditingRate(false)} style={{ background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"0 12px", color:COLORS.textDim, cursor:"pointer" }}><X size={18}/></button>
            </div>
          ) : (
            <button onClick={()=>{setRateInput(String(data.exchangeRate||89000));setEditingRate(true);}} style={{ display:"flex", justifyContent:"space-between", width:"100%", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 14px", color:COLORS.text, cursor:"pointer", fontSize:15 }}>
              <span>1$ = {fmtLBP(data.exchangeRate||89000)} ل.ل</span>
              <Edit3 size={16} color={COLORS.textDim}/>
            </button>
          )}
        </div>

        {/* تغيير PIN */}
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>🔐 رمز PIN</div>
          {editingPin ? (
            <>
              <Field label="PIN الجديد (4 أرقام)">
                <input style={inputStyle} type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} placeholder="****" />
              </Field>
              <Field label="تأكيد PIN">
                <input style={inputStyle} type="password" maxLength={4} inputMode="numeric" value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,""))} placeholder="****" />
              </Field>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={savePin} style={{ flex:1, background:COLORS.green, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontWeight:700, cursor:"pointer" }}>حفظ</button>
                <button onClick={()=>{setEditingPin(false);setNewPin("");setConfirmPin("");}} style={{ flex:1, background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px", color:COLORS.textDim, fontWeight:700, cursor:"pointer" }}>إلغاء</button>
              </div>
            </>
          ) : (
            <button onClick={()=>setEditingPin(true)} style={{ display:"flex", justifyContent:"space-between", width:"100%", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 14px", color:COLORS.text, cursor:"pointer", fontSize:15 }}>
              <span>تغيير رمز PIN</span>
              <Edit3 size={16} color={COLORS.textDim}/>
            </button>
          )}
        </div>

        {/* إحصائيات */}
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>📊 إحصائيات عامة</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <Row label="إجمالي الطلبات" value={`${totalOrders} طلب`} />
            <Row label="إجمالي الأرباح $" value={`$${fmt(totalProfitUSD)}`} valueColor={COLORS.green} />
            {totalProfitLBP > 0 && <Row label="إجمالي الأرباح ل.ل" value={`${fmtLBP(totalProfitLBP)} ل.ل`} valueColor={COLORS.blue} />}
            <Row label="إجمالي المصروفات $" value={`$${fmt(totalExpUSD)}`} valueColor={COLORS.red} />
            {totalExpLBP > 0 && <Row label="إجمالي المصروفات ل.ل" value={`${fmtLBP(totalExpLBP)} ل.ل`} valueColor={COLORS.red} />}
            <Row label="الديون الشخصية" value={`${totalDebts} دين`} />
          </div>
        </div>

        {/* تعديل الرصيد يدوياً */}
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:6 }}>✏️ تعديل الرصيد يدوياً</div>
          <div style={{ fontSize:12, color:COLORS.textFaint, marginBottom:12, lineHeight:1.6 }}>في حال أردت تصحيح الرصيد الكلي يدوياً</div>
          <ManualBalanceEditor data={data} persist={persist} showToast={showToast} />
        </div>

        {/* تسجيل خروج */}
        <button onClick={onLogout} style={{ width:"100%", background:COLORS.red, border:"none", borderRadius:14, padding:"14px", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", marginBottom:14 }}>
          🔒 قفل التطبيق
        </button>

        <div style={{ background:"#1a1d27", border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, fontSize:13, color:COLORS.textDim, lineHeight:1.7, marginBottom:20 }}>
          <div style={{ fontWeight:800, color:COLORS.text, marginBottom:8 }}>ملاحظات مهمة</div>
          • البيانات تُحفظ محلياً على هذا الجهاز تلقائياً<br/>
          • كل طلب يُضيف ربحك للرصيد بعملته<br/>
          • كل مصروف يُخصم من الرصيد بعملته<br/>
          • الديون تؤثر على الرصيد عند الإضافة والتسديد
        </div>
      </div>
    </div>
  );
}

function ManualBalanceEditor({ data, persist, showToast }) {
  const [usd, setUsd] = useState(String(data.balanceUSD||0));
  const [lbp, setLbp] = useState(String(Math.round((data.balanceLBP||0)/1000)));
  const [editing, setEditing] = useState(false);

  const save = () => {
    const newUSD = parseFloat(usd)||0;
    const newLBP = (parseFloat(lbp)||0)*1000;
    persist((prev) => ({ ...prev, balanceUSD: newUSD, balanceLBP: newLBP }));
    showToast("تم تحديث الرصيد ✓");
    setEditing(false);
  };

  if (!editing) return (
    <button onClick={()=>setEditing(true)} style={{ width:"100%", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 14px", color:COLORS.text, cursor:"pointer", fontSize:14, display:"flex", justifyContent:"space-between" }}>
      <span>تعديل الرصيد</span>
      <Edit3 size={16} color={COLORS.textDim}/>
    </button>
  );

  return (
    <>
      <Field label="الرصيد بالدولار ($)">
        <div style={{ position:"relative" }}>
          <input style={{ ...inputStyle, paddingInlineStart:24 }} type="number" value={usd} onChange={e=>setUsd(e.target.value)} />
          <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontWeight:700 }}>$</span>
        </div>
      </Field>
      <Field label="الرصيد بالليرة (ألف ل.ل)">
        <div style={{ position:"relative" }}>
          <input style={{ ...inputStyle, paddingInlineEnd:50 }} type="number" value={lbp} onChange={e=>setLbp(e.target.value)} />
          <span style={{ position:"absolute", insetInlineEnd:10, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontSize:11, fontWeight:700 }}>ألف</span>
        </div>
        {lbp && <div style={{ fontSize:11, color:COLORS.textFaint, marginTop:3 }}>= {fmtLBP((parseFloat(lbp)||0)*1000)} ل.ل</div>}
      </Field>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={save} style={{ flex:1, background:COLORS.green, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontWeight:700, cursor:"pointer" }}>حفظ</button>
        <button onClick={()=>setEditing(false)} style={{ flex:1, background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px", color:COLORS.textDim, fontWeight:700, cursor:"pointer" }}>إلغاء</button>
      </div>
    </>
  );
}                                                     }
