import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Home, Settings, Plus, ShoppingBag, Banknote, X, Trash2,
  ChevronRight as ChevronRightIcon, Edit3, Check, Users, RefreshCw
} from "lucide-react";
import { loadFromCloud, saveToCloud, subscribeToCloud } from "./firebase";

const COLORS = {
  bg: "#0f1117", bgCard: "#1a1d27", bgCard2: "#21253a",
  border: "#2a2f45", green: "#00c896", greenDim: "#00a07a",
  orange: "#ff8c42", blue: "#4f8ef7", red: "#ff4d6d",
  purple: "#b06cf3", yellow: "#ffd166",
  text: "#f0f2ff", textDim: "#8b90b0", textFaint: "#5a5f7a",
};

const COMPANY_COLORS = ["#ff4d6d","#4f8ef7","#00c896","#ff8c42","#b06cf3","#ffd166","#06d6a0","#f72585"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (n, d=2) => Number(n||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtLBP = (n) => Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
const LOCAL_KEY = "delivery_v5_local";
const DATA_VERSION = "v5";

const DAILY_QUOTES = [
  "كل يوم جديد هو فرصة جديدة لتحقيق أهدافك 🌅",
  "العمل الجاد اليوم هو راحة الغد 💪",
  "كل طلب تسلمه هو خطوة نحو النجاح 🛵",
  "الالتزام والمثابرة هما مفتاح التميز ⭐",
  "ابدأ يومك بنية صادقة وستنتهي بنتائج رائعة 🌟",
  "الوقت هو أغلى ما تملك، استثمره جيداً ⏰",
  "كل عميل راضٍ هو إنجاز تفخر به 😊",
  "التنظيم المالي اليوم يضمن مستقبلاً أفضل 💰",
  "لا تؤجل ما يمكن تسجيله الآن 📝",
  "الدقة في العمل تعكس احترافيتك 🎯",
  "كل مصروف مسجل يساعدك على التوفير 💡",
  "التعاون مع من تحب يجعل العمل أجمل ❤️",
  "راقب أرباحك يومياً وستفاجأ بالنتيجة 📈",
  "الأمانة في العمل أساس كل نجاح 🤝",
  "يوم مثمر يبدأ بتنظيم جيد 🗂️",
];

const DEFAULT_USERS = [
  { id:"user1", username:"ammar", password:"1234", displayName:"عمار", role:"admin" },
  { id:"user2", username:"wife", password:"1234", displayName:"زوجتي", role:"user" },
];

const DEFAULT_DATA = {
  exchangeRate: 89000,
  companies: [],
  orders: [],
  expenses: [],
  personalDebts: [],
  conversions: [],
  users: DEFAULT_USERS,
  _version: DATA_VERSION,
};

function calcBalance(data) {
  const orders = data.orders || [];
  const expenses = data.expenses || [];
  const debts = data.personalDebts || [];
  const conversions = data.conversions || [];
  let balanceUSD = 0, balanceLBP = 0;

  // المقبوض من الطلبات
  orders.forEach(o => {
    balanceUSD += o.collectedUSD || 0;
    balanceLBP += (o.collectedLBP || 0) * 1000;
  });

  // التسديدات للشركات
  orders.filter(o => o.settled).forEach(o => { balanceUSD -= o.dueToCompany || 0; });

  // المصروفات
  expenses.forEach(e => {
    if (e.affectsBalance !== false) {
      if (e.currency === "usd") balanceUSD -= e.amount || 0;
      else balanceLBP -= (e.amount || 0) * 1000;
    }
  });

  // الديون
  debts.forEach(d => {
    if (d.affectsBalance !== false) {
      const paid = (d.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      const amt = d.amount || 0;
      if (d.direction === "owedToMe") {
        if (d.currency === "usd") balanceUSD += amt - paid;
        else balanceLBP += (amt - paid) * 1000;
      } else {
        if (d.currency === "usd") { balanceUSD += amt; balanceUSD -= paid; }
        else { balanceLBP += amt * 1000; balanceLBP -= paid * 1000; }
      }
    }
  });

  // التحويلات
  conversions.forEach(c => {
    if (c.dir === "usd_to_lbp") {
      balanceUSD -= c.amount || 0;
      balanceLBP += (c.amount || 0) * (c.rate || 89000);
    } else {
      balanceLBP -= (c.amount || 0) * 1000;
      balanceUSD += (c.amount || 0) * 1000 / (c.rate || 89000);
    }
  });

  return { balanceUSD, balanceLBP };
}

function calcOrderStats(orders) {
  const active = orders.filter(o => !o.settled);
  const profitUSD = active.reduce((s,o) => s + (o.profit||0), 0);
  const tipsUSD = active.reduce((s,o) => s + (o.tips||0), 0);
  const dueUSD = active.reduce((s,o) => s + (o.dueToCompany||0), 0);
  return { profitUSD, tipsUSD, dueUSD };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = DEFAULT_USERS;
    if (!parsed.conversions) parsed.conversions = [];
    return { ...DEFAULT_DATA, ...parsed };
  } catch { return DEFAULT_DATA; }
}

function saveLocal(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 12px", position:"sticky", top:0, background:COLORS.bg, zIndex:10, borderBottom:`1px solid ${COLORS.border}` }}>
      <div style={{ width:36 }}>
        {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.text, cursor:"pointer", padding:6 }}><ChevronRightIcon size={24}/></button>}
      </div>
      <div style={{ fontSize:18, fontWeight:800, color:COLORS.text }}>{title}</div>
      <div style={{ width:36, display:"flex", justifyContent:"flex-end" }}>{right}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:13, color:COLORS.textDim, marginBottom:6, fontWeight:600 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`,
  borderRadius:12, padding:"13px 14px", color:COLORS.text, fontSize:16,
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};

function SaveBtn({ onClick, label="حفظ", color=COLORS.green, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", background:disabled?COLORS.textFaint:color, border:"none", borderRadius:14, padding:"16px", color:"#fff", fontSize:17, fontWeight:800, cursor:disabled?"not-allowed":"pointer", marginTop:8 }}>
      {label}
    </button>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
      <span style={{ color:COLORS.textDim }}>{label}</span>
      <span style={{ fontWeight:700, color:valueColor||COLORS.text }}>{value}</span>
    </div>
  );
}

function CurrencyToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:10, background:COLORS.bgCard2, borderRadius:10, padding:4 }}>
      <button onClick={() => onChange("usd")} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:value==="usd"?COLORS.green:"transparent", color:value==="usd"?"#fff":COLORS.textDim, fontSize:13 }}>$ دولار</button>
      <button onClick={() => onChange("lbp")} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:value==="lbp"?COLORS.blue:"transparent", color:value==="lbp"?"#fff":COLORS.textDim, fontSize:13 }}>ل.ل ليرة</button>
    </div>
  );
}

function AmountInput({ currency, value, onChange, placeholder="0" }) {
  return (
    <div>
      <div style={{ position:"relative" }}>
        <input style={{ ...inputStyle, paddingInlineStart:currency==="usd"?28:14, paddingInlineEnd:currency==="lbp"?60:14 }}
          type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        {currency==="usd" && <span style={{ position:"absolute", insetInlineStart:12, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontWeight:700 }}>$</span>}
        {currency==="lbp" && <span style={{ position:"absolute", insetInlineEnd:12, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontSize:12, fontWeight:700 }}>ألف ل.ل</span>}
      </div>
      {currency==="lbp" && value && <div style={{ fontSize:11, color:COLORS.textFaint, marginTop:4 }}>= {fmtLBP((parseFloat(value)||0)*1000)} ل.ل</div>}
    </div>
  );
}

function LoginScreen({ onLogin, users }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [biometricAvail, setBiometricAvail] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(r => setBiometricAvail(r)).catch(() => {});
    }
  }, []);

  const handleLogin = () => {
    const allUsers = users || DEFAULT_USERS;
    const user = allUsers.find(u => u.username === username.trim() && u.password === password);
    if (user) {
      localStorage.setItem("biometric_user", JSON.stringify(user));
      onLogin(user);
    } else {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  };

  const handleBiometric = () => {
    const savedUser = localStorage.getItem("biometric_user");
    if (savedUser) onLogin(JSON.parse(savedUser));
    else setError("سجّل دخول مرة بكلمة المرور أولاً لتفعيل البصمة");
  };

  const today = new Date();
  const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div dir="rtl" style={{ minHeight:"100vh", background:`linear-gradient(135deg, #0f1117 0%, #1a1d27 50%, #0f1117 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI', Tahoma, Arial, sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:99, background:`${COLORS.green}08` }} />
      <div style={{ position:"absolute", bottom:-40, left:-40, width:150, height:150, borderRadius:99, background:`${COLORS.blue}08` }} />
      <div style={{ marginBottom:28, textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ width:90, height:90, borderRadius:26, background:`linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, margin:"0 auto 14px", boxShadow:`0 20px 50px ${COLORS.green}40` }}>🛵</div>
        <div style={{ fontSize:26, fontWeight:800, color:COLORS.text }}>دليفري بزنس</div>
        <div style={{ fontSize:12, color:COLORS.textDim, marginTop:4 }}>{dayNames[today.getDay()]}، {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}</div>
      </div>
      <div style={{ width:"100%", maxWidth:380, background:COLORS.bgCard, borderRadius:24, padding:24, border:`1px solid ${COLORS.border}`, position:"relative", zIndex:1 }}>
        <div style={{ fontSize:16, fontWeight:800, color:COLORS.text, marginBottom:20, textAlign:"center" }}>🔐 تسجيل الدخول</div>
        <Field label="اسم المستخدم">
          <input style={inputStyle} value={username} onChange={e=>setUsername(e.target.value)} placeholder="أدخل اسم المستخدم" autoCapitalize="none" />
        </Field>
        <Field label="كلمة المرور">
          <input style={inputStyle} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة المرور" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </Field>
        {error && <div style={{ color:COLORS.red, fontSize:13, marginBottom:10, textAlign:"center", fontWeight:600 }}>{error}</div>}
        <SaveBtn onClick={handleLogin} label="دخول" disabled={!username||!password} />
        {biometricAvail && (
          <div style={{ marginTop:16, textAlign:"center" }}>
            <div style={{ fontSize:12, color:COLORS.textFaint, marginBottom:10 }}>أو ادخل ببصمة الإصبع</div>
            <button onClick={handleBiometric} style={{ width:60, height:60, borderRadius:99, background:COLORS.bgCard2, border:`2px solid ${COLORS.green}40`, fontSize:28, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>👆</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeliveryApp() {
  const [data, setData] = useState(() => loadLocal());
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [subScreen, setSubScreen] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const skipSync = useRef(false);

  useEffect(() => {
    loadFromCloud().then(cloudData => {
      if (cloudData && cloudData._version === DATA_VERSION) {
        const merged = { ...DEFAULT_DATA, ...cloudData };
        if (!merged.users) merged.users = DEFAULT_USERS;
        if (!merged.conversions) merged.conversions = [];
        setData(merged);
        saveLocal(merged);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = subscribeToCloud((cloudData) => {
      if (skipSync.current) { skipSync.current = false; return; }
      if (cloudData && cloudData._version === DATA_VERSION) {
        const merged = { ...DEFAULT_DATA, ...cloudData };
        if (!merged.users) merged.users = DEFAULT_USERS;
        if (!merged.conversions) merged.conversions = [];
        setData(merged);
        saveLocal(merged);
      }
    });
    return () => unsub();
  }, []);

  const persist = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const { balanceUSD, balanceLBP } = calcBalance(next);
      const final = { ...next, balanceUSD, balanceLBP, _version: DATA_VERSION };
      saveLocal(final);
      skipSync.current = true;
      setSyncing(true);
      saveToCloud(final).finally(() => setSyncing(false));
      return final;
    });
  }, []);

  const showToast = (msg, color=COLORS.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen("home");
    setSubScreen(null);
    setSelectedCompany(null);
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} users={data.users} />;

  const rate = data.exchangeRate || 89000;
  const { balanceUSD, balanceLBP } = calcBalance(data);

  const totalOwedByMeUSD = (data.personalDebts||[])
    .filter(d=>d.direction==="owedByMe"&&d.currency==="usd"&&d.affectsBalance!==false)
    .reduce((s,d)=>{ const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid); },0);
  const totalOwedByMeLBP = (data.personalDebts||[])
    .filter(d=>d.direction==="owedByMe"&&d.currency==="lbp"&&d.affectsBalance!==false)
    .reduce((s,d)=>{ const paid=(d.payments||[]).reduce((a,p)=>a+(p.amount||0),0); return s+Math.max(0,d.amount-paid)*1000; },0);

  const showNav = !subScreen && !selectedCompany && ["home","orders","expenses","settings"].includes(screen);
  const goTo = (s, sub=null) => { setScreen(s); setSubScreen(sub); setEditingItem(null); };

  let content;
  if (selectedCompany) {
    if (subScreen==="addOrder") {
      content = <OrderForm data={data} persist={persist} showToast={showToast} editing={editingItem} company={selectedCompany} currentUser={currentUser} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else {
      content = <CompanyScreen data={data} persist={persist} showToast={showToast} company={selectedCompany} currentUser={currentUser} onBack={() => { setSelectedCompany(null); setSubScreen(null); }} onAddOrder={() => { setEditingItem(null); setSubScreen("addOrder"); }} onEditOrder={(o) => { setEditingItem(o); setSubScreen("addOrder"); }} rate={rate} />;
    }
  } else if (screen==="home") {
    content = <HomeScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onSelectCompany={setSelectedCompany} currentUser={currentUser} balanceUSD={balanceUSD} balanceLBP={balanceLBP} totalOwedByMeUSD={totalOwedByMeUSD} totalOwedByMeLBP={totalOwedByMeLBP} />;
  } else if (screen==="orders") {
    content = <OrdersScreen data={data} rate={rate} />;
  } else if (screen==="expenses") {
    if (subScreen==="add"||subScreen==="edit") {
      content = <ExpenseForm data={data} persist={persist} showToast={showToast} editing={editingItem} currentUser={currentUser} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else {
      content = <ExpensesScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onEdit={item => { setEditingItem(item); setSubScreen("edit"); }} />;
    }
  } else if (screen==="debts") {
    if (subScreen==="add"||subScreen==="edit") {
      content = <DebtForm data={data} persist={persist} showToast={showToast} editing={editingItem} onBack={() => { setSubScreen(null); setEditingItem(null); }} rate={rate} />;
    } else if (subScreen==="pay") {
      content = <PayDebtScreen debt={editingItem} persist={persist} showToast={showToast} onBack={() => { setSubScreen(null); setEditingItem(null); }} />;
    } else {
      content = <DebtsScreen data={data} persist={persist} showToast={showToast} goTo={goTo} rate={rate} onEdit={item => { setEditingItem(item); setSubScreen("edit"); }} onPay={item => { setEditingItem(item); setSubScreen("pay"); }} onBack={() => setScreen("home")} />;
    }
  } else if (screen==="settings") {
    content = <SettingsScreen data={data} persist={persist} showToast={showToast} onLogout={handleLogout} rate={rate} currentUser={currentUser} balanceUSD={balanceUSD} balanceLBP={balanceLBP} />;
  }

  return (
    <div dir="rtl" style={{ height:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI', Tahoma, Arial, sans-serif", color:COLORS.text, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {syncing && (
        <div style={{ position:"fixed", top:8, left:"50%", transform:"translateX(-50%)", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:20, padding:"4px 12px", fontSize:11, color:COLORS.textDim, zIndex:300, display:"flex", alignItems:"center", gap:6 }}>
          <RefreshCw size={11}/> مزامنة...
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", minHeight:0 }}>
        {content}
        <div style={{ height:20 }} />
      </div>
      {toast && (
        <div style={{ position:"fixed", bottom:showNav?90:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"10px 24px", borderRadius:30, fontSize:14, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", zIndex:200, whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
      {showNav && <BottomNav screen={screen} setScreen={s => { setScreen(s); setSubScreen(null); setEditingItem(null); setSelectedCompany(null); }} />}
    </div>
  );
}

function BottomNav({ screen, setScreen }) {
  const items = [
    { key:"settings", label:"الإعدادات", icon:Settings },
    { key:"expenses", label:"المصروفات", icon:Banknote },
    { key:"home", label:"الرئيسية", icon:Home },
    { key:"orders", label:"الطلبات", icon:ShoppingBag },
    { key:"debts", label:"الديون", icon:Users },
  ];
  return (
    <div style={{ flexShrink:0, background:COLORS.bgCard, borderTop:`1px solid ${COLORS.border}`, display:"flex", justifyContent:"space-around", padding:"10px 0 calc(10px + env(safe-area-inset-bottom))", zIndex:50 }}>
      {items.map(it => {
        const active = screen===it.key;
        const Icon = it.icon;
        return (
          <button key={it.key} onClick={() => setScreen(it.key)} style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:active?COLORS.green:COLORS.textFaint, cursor:"pointer", padding:"4px 8px" }}>
            <Icon size={22}/>
            <span style={{ fontSize:10, fontWeight:700 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function getCompanyDue(data, companyId) {
  const orders = (data.orders||[]).filter(o => o.companyId===companyId && !o.settled);
  const dueUSD = orders.filter(o=>o.currency==="usd").reduce((s,o)=>s+(o.dueToCompany||0),0);
  const dueLBP = orders.filter(o=>o.currency==="lbp").reduce((s,o)=>s+(o.dueToCompany||0)*1000,0);
  return { dueUSD, dueLBP };
}

function HomeScreen({ data, persist, showToast, goTo, rate, onSelectCompany, currentUser, balanceUSD, balanceLBP, totalOwedByMeUSD, totalOwedByMeLBP }) {
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyColor, setNewCompanyColor] = useState(COMPANY_COLORS[0]);

  const companies = data.companies || [];
  const orders = data.orders || [];
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString()===todayStr);
  const { profitUSD: todayProfitUSD, tipsUSD: todayTipsUSD, dueUSD: todayDueUSD } = calcOrderStats(todayOrders);
  const totalExpUSD = (data.expenses||[]).filter(e=>e.currency==="usd"&&e.affectsBalance!==false).reduce((s,e)=>s+(e.amount||0),0);

  const today = new Date();
  const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const hour = today.getHours();
  const greeting = hour<12?"صباح الخير ☀️":hour<17?"مساء الخير 🌤️":"مساء النور 🌙";
  const quoteIndex = Math.floor((today.getTime() / 86400000)) % DAILY_QUOTES.length;

  const addCompany = () => {
    if (!newCompanyName.trim()) return;
    persist(prev => ({ ...prev, companies: [...(prev.companies||[]), { id:uid(), name:newCompanyName.trim(), color:newCompanyColor }] }));
    showToast("تمت إضافة الشركة ✓");
    setNewCompanyName(""); setShowAddCompany(false);
  };

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg, ${COLORS.green}25 0%, ${COLORS.bg} 60%)`, padding:"24px 16px 20px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, left:-40, width:140, height:140, borderRadius:99, background:`${COLORS.green}08` }} />
        <div style={{ position:"absolute", bottom:-20, right:-20, width:100, height:100, borderRadius:99, background:`${COLORS.blue}08` }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:12, color:COLORS.green, fontWeight:700 }}>{greeting}</div>
              <div style={{ fontSize:24, fontWeight:800, color:COLORS.text, marginTop:2 }}>{currentUser?.displayName||"عمار"} 👋</div>
              <div style={{ fontSize:11, color:COLORS.textFaint, marginTop:3 }}>{dayNames[today.getDay()]}، {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}</div>
            </div>
            <div style={{ width:54, height:54, borderRadius:16, background:`linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:`0 8px 24px ${COLORS.green}40` }}>🛵</div>
          </div>

          <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:20, padding:"16px 18px", marginBottom:14, border:`1px solid ${COLORS.green}20` }}>
            <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:8 }}>💼 الرصيد الكلي</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                  <div style={{ fontSize:28, fontWeight:800, color:COLORS.text }}>${fmt(balanceUSD)}</div>
                  {totalOwedByMeUSD>0 && <div style={{ fontSize:14, fontWeight:700, color:COLORS.red }}>-${fmt(totalOwedByMeUSD)}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:2 }}>
                  <div style={{ fontSize:12, color:COLORS.blue }}>{fmtLBP(balanceLBP)} ل.ل</div>
                  {totalOwedByMeLBP>0 && <div style={{ fontSize:11, color:COLORS.red }}>-{fmtLBP(totalOwedByMeLBP)} ل.ل</div>}
                </div>
              </div>
              <div style={{ width:58, height:58, borderRadius:99, background:`${COLORS.green}20`, border:`2px solid ${COLORS.green}40`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:20, fontWeight:800, color:COLORS.green }}>{todayOrders.length}</div>
                <div style={{ fontSize:9, color:COLORS.textDim }}>طلب اليوم</div>
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            {[
              {icon:"💰",label:"أرباح",value:`$${fmt(todayProfitUSD)}`,color:COLORS.green},
              {icon:"🎁",label:"تيبس",value:`$${fmt(todayTipsUSD)}`,color:COLORS.purple},
              {icon:"🏢",label:"مترتب",value:`$${fmt(todayDueUSD)}`,color:COLORS.orange},
              {icon:"💸",label:"مصروف",value:`$${fmt(totalExpUSD)}`,color:COLORS.red},
            ].map((s,i)=>(
              <div key={i} style={{ background:"rgba(0,0,0,0.25)", borderRadius:14, padding:"10px 6px", textAlign:"center", border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:12, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ background:`linear-gradient(135deg, ${COLORS.green}15, ${COLORS.bgCard2})`, border:`1px solid ${COLORS.green}25`, borderRadius:16, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:22, flexShrink:0 }}>💡</div>
          <div>
            <div style={{ fontSize:10, color:COLORS.green, fontWeight:700, marginBottom:3 }}>عبارة اليوم</div>
            <div style={{ fontSize:12, color:COLORS.text, lineHeight:1.5 }}>{DAILY_QUOTES[quoteIndex]}</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <button onClick={()=>setShowQuickOrder(true)} style={{ background:`linear-gradient(135deg, ${COLORS.green}30, ${COLORS.green}10)`, border:`2px solid ${COLORS.green}50`, borderRadius:16, padding:"16px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${COLORS.green}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📦</div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, fontWeight:800, color:COLORS.green }}>طلب سريع</div>
              <div style={{ fontSize:10, color:COLORS.textDim }}>إضافة فورية</div>
            </div>
          </button>
          <button onClick={()=>goTo("expenses","add")} style={{ background:`linear-gradient(135deg, ${COLORS.red}25, ${COLORS.red}10)`, border:`2px solid ${COLORS.red}40`, borderRadius:16, padding:"16px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${COLORS.red}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💸</div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, fontWeight:800, color:COLORS.red }}>مصروف</div>
              <div style={{ fontSize:10, color:COLORS.textDim }}>دولار أو ليرة</div>
            </div>
          </button>
          <button onClick={()=>goTo("settings")} style={{ background:`${COLORS.blue}18`, border:`1px solid ${COLORS.blue}40`, borderRadius:14, padding:"14px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <span style={{ fontSize:20 }}>🔄</span>
            <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>تحويل عملة</span>
          </button>
          <button onClick={()=>goTo("orders")} style={{ background:`${COLORS.purple}18`, border:`1px solid ${COLORS.purple}40`, borderRadius:14, padding:"14px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <span style={{ fontSize:20 }}>📊</span>
            <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>كل الطلبات</span>
          </button>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:16, fontWeight:800 }}>🏢 الشركات</div>
          <button onClick={()=>setShowAddCompany(true)} style={{ background:`${COLORS.green}20`, border:`1px solid ${COLORS.green}40`, borderRadius:10, padding:"8px 14px", color:COLORS.green, fontWeight:700, fontSize:13, cursor:"pointer" }}>+ إضافة</button>
        </div>

        {showAddCompany && (
          <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
            <Field label="اسم الشركة">
              <input style={inputStyle} value={newCompanyName} onChange={e=>setNewCompanyName(e.target.value)} placeholder="مثال: Godzilla" autoFocus />
            </Field>
            <Field label="اللون">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {COMPANY_COLORS.map(c => <button key={c} onClick={()=>setNewCompanyColor(c)} style={{ width:36, height:36, borderRadius:10, background:c, border:newCompanyColor===c?"3px solid #fff":"3px solid transparent", cursor:"pointer" }} />)}
              </div>
            </Field>
            <div style={{ display:"flex", gap:8 }}>
              <SaveBtn onClick={addCompany} disabled={!newCompanyName.trim()} label="إضافة" />
              <button onClick={()=>setShowAddCompany(false)} style={{ flex:1, background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:"16px", color:COLORS.textDim, fontWeight:700, cursor:"pointer", marginTop:8 }}>إلغاء</button>
            </div>
          </div>
        )}

        {companies.length===0 && !showAddCompany && (
          <div style={{ textAlign:"center", color:COLORS.textFaint, padding:"30px 0" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🏢</div>
            <div>لا توجد شركات بعد</div>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
          {companies.map(company => {
            const { dueUSD, dueLBP } = getCompanyDue(data, company.id);
            const companyOrders = (data.orders||[]).filter(o=>o.companyId===company.id);
            const todayCount = companyOrders.filter(o=>new Date(o.createdAt).toDateString()===todayStr).length;
            const totalProfitUSD = companyOrders.filter(o=>o.currency==="usd").reduce((s,o)=>s+(o.profit||0),0);
            return (
              <div key={company.id} onClick={()=>onSelectCompany(company)} style={{ background:`linear-gradient(135deg, ${COLORS.bgCard}, ${COLORS.bgCard2})`, border:`2px solid ${company.color}30`, borderRadius:20, padding:16, cursor:"pointer", boxShadow:`0 4px 20px ${company.color}10` }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:50, height:50, borderRadius:16, background:`linear-gradient(135deg, ${company.color}, ${company.color}80)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", flexShrink:0, boxShadow:`0 4px 14px ${company.color}50` }}>
                    {company.name.slice(0,1)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16, color:COLORS.text }}>{company.name}</div>
                    <div style={{ fontSize:11, color:COLORS.textFaint, marginTop:2 }}>{todayCount} طلب اليوم · {companyOrders.length} إجمالي</div>
                  </div>
                  <div style={{ color:COLORS.textFaint, fontSize:20 }}>›</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div style={{ background:"rgba(0,0,0,0.25)", borderRadius:14, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:COLORS.orange, fontWeight:700, marginBottom:4 }}>💰 مترتب للشركة</div>
                    <div style={{ fontSize:20, fontWeight:800, color:COLORS.orange }}>${fmt(dueUSD)}</div>
                    {dueLBP>0 && <div style={{ fontSize:10, color:COLORS.blue }}>{fmtLBP(dueLBP)} ل.ل</div>}
                    {dueUSD>0 && <div style={{ marginTop:6, background:COLORS.orange, borderRadius:8, padding:"5px 0", textAlign:"center", fontSize:11, fontWeight:700, color:"#fff" }}>تسديد الآن</div>}
                    {dueUSD===0&&dueLBP===0 && <div style={{ fontSize:10, color:COLORS.green, marginTop:4 }}>✅ لا يوجد مترتب</div>}
                  </div>
                  <div style={{ background:"rgba(0,0,0,0.25)", borderRadius:14, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:COLORS.green, fontWeight:700, marginBottom:4 }}>📈 إجمالي الأرباح</div>
                    <div style={{ fontSize:20, fontWeight:800, color:COLORS.green }}>${fmt(totalProfitUSD)}</div>
                    <div style={{ fontSize:10, color:COLORS.textDim, marginTop:4 }}>{companyOrders.length} طلب</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showQuickOrder && (
        <QuickOrderSheet data={data} persist={persist} showToast={showToast} rate={rate} currentUser={currentUser} companies={companies} onClose={()=>setShowQuickOrder(false)} />
      )}
    </div>
  );
}

function QuickOrderSheet({ data, persist, showToast, rate, currentUser, companies, onClose }) {
  const [step, setStep] = useState(companies.length===1?"order":"company");
  const [selectedCompany, setSelectedCompany] = useState(companies.length===1?companies[0]:null);
  const [currency, setCurrency] = useState("usd");
  const [orderValue, setOrderValue] = useState("");
  const [profit, setProfit] = useState("");
  const [collectedUSD, setCollectedUSD] = useState("");
  const [collectedLBP, setCollectedLBP] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const ov=parseFloat(orderValue)||0, pr=parseFloat(profit)||0;
  const dueToCompany=Math.max(0,ov-pr);
  const colUSD=parseFloat(collectedUSD)||0, colLBP=parseFloat(collectedLBP)||0;
  const totalColUSD=colUSD+(colLBP*1000/rate);
  const tips=Math.max(0,totalColUSD-dueToCompany-pr);

  const save=()=>{
    const order={ id:uid(), currency, companyId:selectedCompany.id, companyName:selectedCompany.name, orderNumber:orderNumber.trim(), orderValue:ov, profit:pr, dueToCompany, collectedUSD:colUSD, collectedLBP:colLBP, tips, note:"", createdAt:Date.now(), settled:false, byName:currentUser?.displayName||"" };
    persist(prev=>({...prev,orders:[...(prev.orders||[]),order]}));
    showToast("تم حفظ الطلب ✓");
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", background:COLORS.bgCard, borderRadius:"20px 20px 0 0", padding:"18px 16px calc(24px + env(safe-area-inset-bottom))", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, background:COLORS.border, borderRadius:99, margin:"0 auto 16px" }} />
        <div style={{ fontSize:16, fontWeight:800, marginBottom:16, textAlign:"center" }}>📦 طلب سريع</div>
        {step==="company" && (
          <>
            <div style={{ fontSize:13, color:COLORS.textDim, marginBottom:10 }}>اختر الشركة:</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {companies.map(c=>(
                <button key={c.id} onClick={()=>{setSelectedCompany(c);setStep("order");}} style={{ display:"flex", alignItems:"center", gap:12, background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:12, cursor:"pointer", textAlign:"right" }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:c.color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff" }}>{c.name.slice(0,1)}</div>
                  <div style={{ fontWeight:700 }}>{c.name}</div>
                </button>
              ))}
            </div>
          </>
        )}
        {step==="order" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, background:COLORS.bgCard2, borderRadius:12, padding:10 }}>
              {companies.length>1 && <button onClick={()=>setStep("company")} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer" }}><ChevronRightIcon size={20}/></button>}
              <div style={{ width:32, height:32, borderRadius:8, background:selectedCompany?.color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:14 }}>{selectedCompany?.name.slice(0,1)}</div>
              <div style={{ fontWeight:800 }}>{selectedCompany?.name}</div>
            </div>
            <div style={{ background:COLORS.bgCard2, borderRadius:14, padding:12, marginBottom:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[{label:"مترتب",value:currency==="usd"?`$${fmt(dueToCompany)}`:`${fmt(dueToCompany)} ألف`,color:COLORS.orange},{label:"ربح",value:currency==="usd"?`$${fmt(pr)}`:`${fmt(pr)} ألف`,color:COLORS.green},{label:"تيبس",value:`$${fmt(tips)}`,color:COLORS.purple}].map((s,i)=>(
                  <div key={i} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <Field label="العملة"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
            <Field label="رقم الطلب (اختياري)"><input style={inputStyle} value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="#1258" /></Field>
            <Field label={currency==="usd"?"قيمة الطلب ($)":"قيمة الطلب (ألف ل.ل)"}><AmountInput currency={currency} value={orderValue} onChange={setOrderValue} /></Field>
            <Field label={currency==="usd"?"ربحك ($)":"ربحك (ألف ل.ل)"}><AmountInput currency={currency} value={profit} onChange={setProfit} /></Field>
            <div style={{ fontSize:13, color:COLORS.textDim, marginBottom:8, fontWeight:600 }}>المقبوض من الزبون</div>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:COLORS.textFaint, marginBottom:6 }}>بالدولار $</div>
                <div style={{ position:"relative" }}>
                  <input style={{ ...inputStyle, paddingInlineStart:24 }} type="number" inputMode="decimal" value={collectedUSD} onChange={e=>setCollectedUSD(e.target.value)} placeholder="0" />
                  <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontWeight:700 }}>$</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:COLORS.textFaint, marginBottom:6 }}>بالليرة (ألف)</div>
                <div style={{ position:"relative" }}>
                  <input style={{ ...inputStyle, paddingInlineEnd:50 }} type="number" inputMode="decimal" value={collectedLBP} onChange={e=>setCollectedLBP(e.target.value)} placeholder="0" />
                  <span style={{ position:"absolute", insetInlineEnd:8, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontSize:11, fontWeight:700 }}>ألف</span>
                </div>
              </div>
            </div>
            <SaveBtn disabled={ov<=0} onClick={save} label="حفظ الطلب ✓" />
          </>
        )}
      </div>
    </div>
  );
}

function CompanyScreen({ data, persist, showToast, company, currentUser, onBack, onAddOrder, onEditOrder, rate }) {
  const [showSettle, setShowSettle] = useState(false);
  const { dueUSD, dueLBP } = getCompanyDue(data, company.id);
  const companyOrders = (data.orders||[]).filter(o=>o.companyId===company.id).sort((a,b)=>b.createdAt-a.createdAt);
  const { profitUSD: totalProfitUSD, tipsUSD: totalTipsUSD } = calcOrderStats(companyOrders);

  const deleteCompany = () => {
    persist(prev=>({...prev,companies:(prev.companies||[]).filter(c=>c.id!==company.id),orders:(prev.orders||[]).filter(o=>o.companyId!==company.id)}));
    showToast("تم حذف الشركة"); onBack();
  };

  const settleCompany = () => {
    persist(prev=>({...prev,orders:(prev.orders||[]).map(o=>o.companyId===company.id&&!o.settled?{...o,settled:true}:o)}));
    showToast("تم تسديد حساب الشركة ✓"); setShowSettle(false);
  };

  const deleteOrder = (id) => {
    persist(prev=>({...prev,orders:prev.orders.filter(o=>o.id!==id)}));
    showToast("تم حذف الطلب");
  };

  return (
    <div>
      <TopBar title={company.name} onBack={onBack} right={<button onClick={deleteCompany} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:12, fontWeight:700 }}>حذف</button>} />
      <div style={{ padding:"0 16px" }}>
        <div style={{ background:`linear-gradient(135deg, ${company.color}20, ${company.color}10)`, border:`1px solid ${company.color}40`, borderRadius:18, padding:18, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg, ${company.color}, ${company.color}80)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, color:"#fff", boxShadow:`0 4px 14px ${company.color}50` }}>{company.name.slice(0,1)}</div>
            <div><div style={{ fontSize:18, fontWeight:800 }}>{company.name}</div><div style={{ fontSize:12, color:COLORS.textFaint }}>{companyOrders.length} طلب إجمالي</div></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[{label:"الأرباح",value:`$${fmt(totalProfitUSD)}`,color:COLORS.green},{label:"مترتب",value:`$${fmt(dueUSD)}`,color:COLORS.orange},{label:"التيبس",value:`$${fmt(totalTipsUSD)}`,color:COLORS.purple}].map((s,i)=>(
              <div key={i} style={{ background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {(dueUSD>0||dueLBP>0) && (
          <div style={{ marginBottom:16 }}>
            {!showSettle ? (
              <button onClick={()=>setShowSettle(true)} style={{ width:"100%", background:`linear-gradient(135deg, ${COLORS.orange}, #ff6b35)`, border:"none", borderRadius:14, padding:"16px", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer" }}>
                💰 تسديد للشركة — ${fmt(dueUSD)} {dueLBP>0?`+ ${fmtLBP(dueLBP)} ل.ل`:""}
              </button>
            ) : (
              <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.orange}`, borderRadius:16, padding:16 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12, textAlign:"center" }}>تأكيد تسديد حساب {company.name}؟</div>
                <div style={{ fontSize:13, color:COLORS.textDim, textAlign:"center", marginBottom:14 }}>سيُخصم <span style={{ color:COLORS.orange, fontWeight:800 }}>${fmt(dueUSD)}</span> من رصيدك</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={settleCompany} style={{ flex:1, background:COLORS.orange, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:15 }}>✓ تأكيد</button>
                  <button onClick={()=>setShowSettle(false)} style={{ flex:1, background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px", color:COLORS.textDim, fontWeight:700, cursor:"pointer" }}>إلغاء</button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onAddOrder} style={{ width:"100%", background:`${COLORS.green}20`, border:`1px solid ${COLORS.green}40`, borderRadius:14, padding:"14px", color:COLORS.green, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Plus size={18}/> إدخال طلب جديد
        </button>

        <div style={{ fontSize:15, fontWeight:800, marginBottom:12 }}>سجل الطلبات ({companyOrders.length})</div>
        {companyOrders.length===0 && <div style={{ textAlign:"center", color:COLORS.textFaint, padding:"30px 0" }}>لا توجد طلبات بعد</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {companyOrders.map(order=><OrderCard key={order.id} order={order} onDelete={()=>deleteOrder(order.id)} onEdit={()=>onEditOrder(order)} />)}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onDelete, onEdit }) {
  const [open,setOpen]=useState(false);
  const isUSD=order.currency==="usd";
  const dt=new Date(order.createdAt);
  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${order.settled?COLORS.green:COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:order.settled?`${COLORS.green}30`:`${COLORS.green}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{order.settled?"✅":"📦"}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{order.orderNumber?`#${order.orderNumber}`:"طلب"} {order.settled?"· مسدّد":""}</div>
            <div style={{ fontSize:11, color:COLORS.textFaint }}>{dt.toLocaleDateString("ar-LB")} · {dt.toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})} {order.byName?`· ${order.byName}`:""}</div>
          </div>
        </div>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontWeight:800, color:COLORS.green, fontSize:14 }}>{isUSD?`+$${fmt(order.profit)}`:`+${fmt(order.profit)} ألف ل.ل`}</div>
          <div style={{ fontSize:10, color:COLORS.orange }}>مترتب: {isUSD?`$${fmt(order.dueToCompany)}`:`${fmt(order.dueToCompany)} ألف`}</div>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          <Row label="قيمة الطلب" value={isUSD?`$${fmt(order.orderValue)}`:`${fmt(order.orderValue)} ألف ل.ل`} />
          <Row label="الربح" value={isUSD?`$${fmt(order.profit)}`:`${fmt(order.profit)} ألف ل.ل`} valueColor={COLORS.green} />
          <Row label="مترتب للشركة" value={isUSD?`$${fmt(order.dueToCompany)}`:`${fmt(order.dueToCompany)} ألف ل.ل`} valueColor={COLORS.orange} />
          <Row label="المقبوض $" value={`$${fmt(order.collectedUSD||0)}`} />
          {(order.collectedLBP||0)>0 && <Row label="المقبوض ل.ل" value={`${fmtLBP((order.collectedLBP||0)*1000)} ل.ل`} />}
          <Row label="التيبس" value={`$${fmt(order.tips||0)}`} valueColor={COLORS.purple} />
          {order.note && <Row label="ملاحظات" value={order.note} />}
          {!order.settled && (
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button onClick={onEdit} style={{ background:"none", border:"none", color:COLORS.blue, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Edit3 size={14}/> تعديل</button>
              <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Trash2 size={14}/> حذف</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderForm({ data, persist, showToast, editing, company, currentUser, onBack, rate }) {
  const e=editing;
  const [currency,setCurrency]=useState(e?.currency||"usd");
  const [orderNumber,setOrderNumber]=useState(e?.orderNumber||"");
  const [orderValue,setOrderValue]=useState(e?String(e.orderValue||""):"");
  const [profit,setProfit]=useState(e?String(e.profit||""):"");
  const [collectedUSD,setCollectedUSD]=useState(e?String(e.collectedUSD||""):"");
  const [collectedLBP,setCollectedLBP]=useState(e?String(e.collectedLBP||""):"");
  const [note,setNote]=useState(e?.note||"");

  const ov=parseFloat(orderValue)||0, pr=parseFloat(profit)||0;
  const dueToCompany=Math.max(0,ov-pr);
  const colUSD=parseFloat(collectedUSD)||0, colLBP=parseFloat(collectedLBP)||0;
  const totalColUSD=colUSD+(colLBP*1000/rate);
  const tips=Math.max(0,totalColUSD-dueToCompany-pr);

  const save=()=>{
    const order={ id:e?e.id:uid(), currency, companyId:company?company.id:e?.companyId, companyName:company?company.name:e?.companyName, orderNumber:orderNumber.trim(), orderValue:ov, profit:pr, dueToCompany, collectedUSD:colUSD, collectedLBP:colLBP, tips, note:note.trim(), createdAt:e?e.createdAt:Date.now(), settled:e?e.settled:false, byName:currentUser?.displayName||"" };
    persist(prev=>({...prev,orders:e?prev.orders.map(o=>o.id===e.id?order:o):[...(prev.orders||[]),order]}));
    showToast(e?"تم تعديل الطلب ✓":"تم حفظ الظلب ✓"); onBack();
  };

  return (
    <div>
      <TopBar title={e?"تعديل الطلب":`طلب — ${company?.name||""}`} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <Field label="عملة الطلب"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:14, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[{label:"مترتب",value:currency==="usd"?`$${fmt(dueToCompany)}`:`${fmt(dueToCompany)} ألف`,color:COLORS.orange},{label:"ربح",value:currency==="usd"?`$${fmt(pr)}`:`${fmt(pr)} ألف`,color:COLORS.green},{label:"تيبس",value:`$${fmt(tips)}`,color:COLORS.purple}].map((s,i)=>(
              <div key={i} style={{ textAlign:"center", background:`${s.color}15`, borderRadius:10, padding:10 }}>
                <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <Field label="رقم الطلب (اختياري)"><input style={inputStyle} value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="#1258" /></Field>
        <Field label={currency==="usd"?"قيمة الطلب ($)":"قيمة الطلب (ألف ل.ل)"}><AmountInput currency={currency} value={orderValue} onChange={setOrderValue} /></Field>
        <Field label={currency==="usd"?"ربحك ($)":"ربحك (ألف ل.ل)"}><AmountInput currency={currency} value={profit} onChange={setProfit} /></Field>
        <div style={{ fontSize:13, color:COLORS.textDim, marginBottom:8, fontWeight:600 }}>المقبوض من الزبون</div>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:COLORS.textFaint, marginBottom:6 }}>بالدولار $</div>
            <div style={{ position:"relative" }}>
              <input style={{ ...inputStyle, paddingInlineStart:24 }} type="number" inputMode="decimal" value={collectedUSD} onChange={e=>setCollectedUSD(e.target.value)} placeholder="0" />
              <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontWeight:700 }}>$</span>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:COLORS.textFaint, marginBottom:6 }}>بالليرة (ألف)</div>
            <div style={{ position:"relative" }}>
              <input style={{ ...inputStyle, paddingInlineEnd:50 }} type="number" inputMode="decimal" value={collectedLBP} onChange={e=>setCollectedLBP(e.target.value)} placeholder="0" />
              <span style={{ position:"absolute", insetInlineEnd:8, top:"50%", transform:"translateY(-50%)", color:COLORS.textDim, fontSize:11, fontWeight:700 }}>ألف</span>
            </div>
            {collectedLBP && <div style={{ fontSize:10, color:COLORS.textFaint, marginTop:3 }}>= {fmtLBP((parseFloat(collectedLBP)||0)*1000)} ل.ل</div>}
          </div>
        </div>
        <Field label="ملاحظات (اختياري)"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظات..." /></Field>
        <SaveBtn disabled={ov<=0} onClick={save} label={e?"حفظ التعديلات":"حفظ الطلب"} />
      </div>
    </div>
  );
}

function OrdersScreen({ data, rate }) {
  const [filter,setFilter]=useState("all");
  const orders=data.orders||[];
  const filtered=useMemo(()=>{
    const today=new Date().toDateString();
    const week=Date.now()-7*24*60*60*1000;
    const month=new Date(); month.setDate(1); month.setHours(0,0,0,0);
    if(filter==="today") return orders.filter(o=>new Date(o.createdAt).toDateString()===today);
    if(filter==="week") return orders.filter(o=>o.createdAt>=week);
    if(filter==="month") return orders.filter(o=>o.createdAt>=month.getTime());
    return orders;
  },[orders,filter]);
  const { profitUSD, tipsUSD, dueUSD } = calcOrderStats(filtered);
  return (
    <div>
      <TopBar title="كل الطلبات" />
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:16, background:COLORS.bgCard2, borderRadius:12, padding:4 }}>
          {[{k:"all",l:"الكل"},{k:"today",l:"اليوم"},{k:"week",l:"الأسبوع"},{k:"month",l:"الشهر"}].map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{ flex:1, padding:"8px 4px", borderRadius:9, border:"none", fontWeight:700, fontSize:12, cursor:"pointer", background:filter===f.k?COLORS.green:"transparent", color:filter===f.k?"#fff":COLORS.textDim }}>{f.l}</button>
          ))}
        </div>
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:14, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[{label:"الأرباح",value:`$${fmt(profitUSD)}`,color:COLORS.green},{label:"مترتب",value:`$${fmt(dueUSD)}`,color:COLORS.orange},{label:"التيبس",value:`$${fmt(tipsUSD)}`,color:COLORS.purple}].map((s,i)=>(
              <div key={i} style={{ textAlign:"center", background:COLORS.bgCard2, borderRadius:10, padding:10 }}>
                <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        {filtered.length===0&&<div style={{ textAlign:"center", color:COLORS.textFaint, padding:"40px 0" }}>لا توجد طلبات</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[...filtered].sort((a,b)=>b.createdAt-a.createdAt).map(order=><OrderCard key={order.id} order={order} onDelete={()=>{}} onEdit={()=>{}} />)}
        </div>
      </div>
    </div>
  );
}

function ExpensesScreen({ data, persist, showToast, goTo, rate, onEdit }) {
  const [filter,setFilter]=useState("all");
  const expenses=data.expenses||[];
  const filtered=useMemo(()=>{
    const today=new Date().toDateString();
    const week=Date.now()-7*24*60*60*1000;
    const month=new Date(); month.setDate(1); month.setHours(0,0,0,0);
    if(filter==="today") return expenses.filter(e=>new Date(e.createdAt).toDateString()===today);
    if(filter==="week") return expenses.filter(e=>e.createdAt>=week);
    if(filter==="month") return expenses.filter(e=>e.createdAt>=month.getTime());
    return expenses;
  },[expenses,filter]);
  const totalUSD=filtered.filter(e=>e.currency==="usd").reduce((s,e)=>s+(e.amount||0),0);
  const totalLBP=filtered.filter(e=>e.currency==="lbp").reduce((s,e)=>s+(e.amount||0)*1000,0);
  const deleteExpense=(id)=>{
    persist(prev=>({...prev,expenses:prev.expenses.filter(e=>e.id!==id)}));
    showToast("تم حذف المصروف");
  };
  return (
    <div>
      <TopBar title="المصروفات" right={<button onClick={()=>goTo("expenses","add")} style={{ background:COLORS.red, border:"none", borderRadius:10, padding:"8px 12px", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>+ جديد</button>} />
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:16, background:COLORS.bgCard2, borderRadius:12, padding:4 }}>
          {[{k:"all",l:"الكل"},{k:"today",l:"اليوم"},{k:"week",l:"الأسبوع"},{k:"month",l:"الشهر"}].map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{ flex:1, padding:"8px 4px", borderRadius:9, border:"none", fontWeight:700, fontSize:12, cursor:"pointer", background:filter===f.k?COLORS.red:"transparent", color:filter===f.k?"#fff":COLORS.textDim }}>{f.l}</button>
          ))}
        </div>
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:4 }}>إجمالي المصروفات</div>
            <div style={{ fontSize:22, fontWeight:800, color:COLORS.red }}>${fmt(totalUSD)}</div>
            {totalLBP>0&&<div style={{ fontSize:13, color:COLORS.blue, marginTop:2 }}>{fmtLBP(totalLBP)} ل.ل</div>}
          </div>
          <div style={{ fontSize:36 }}>💸</div>
        </div>
        {filtered.length===0&&<div style={{ textAlign:"center", color:COLORS.textFaint, padding:"40px 0" }}>لا توجد مصروفات</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[...filtered].sort((a,b)=>b.createdAt-a.createdAt).map(exp=><ExpenseCard key={exp.id} expense={exp} onDelete={()=>deleteExpense(exp.id)} onEdit={()=>onEdit(exp)} rate={rate} />)}
        </div>
      </div>
    </div>
  );
}

function ExpenseCard({ expense, onDelete, onEdit, rate }) {
  const [open,setOpen]=useState(false);
  const isUSD=expense.currency==="usd";
  const dt=new Date(expense.createdAt);
  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${COLORS.red}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💸</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{expense.category||"مصروف"}</div>
            <div style={{ fontSize:11, color:COLORS.textFaint }}>{dt.toLocaleDateString("ar-LB")} · {dt.toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})} {expense.byName?`· ${expense.byName}`:""}</div>
          </div>
        </div>
        <div style={{ textAlign:"left" }}>
          {isUSD
            ? <div style={{ fontWeight:800, color:COLORS.red, fontSize:14 }}>-${fmt(expense.amount)}</div>
            : <div style={{ fontWeight:800, color:COLORS.red, fontSize:14 }}>-{fmtLBP(expense.amount*1000)} ل.ل</div>
          }
        </div>
      </div>
      {open&&(
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          <Row label="النوع" value={expense.category||""} />
          <Row label="المبلغ" value={isUSD?`$${fmt(expense.amount)}`:`${fmtLBP(expense.amount*1000)} ل.ل`} valueColor={COLORS.red} />
          {expense.note&&<Row label="ملاحظات" value={expense.note} />}
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={onEdit} style={{ background:"none", border:"none", color:COLORS.blue, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Edit3 size={14}/> تعديل</button>
            <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Trash2 size={14}/> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseForm({ data, persist, showToast, editing, currentUser, onBack, rate }) {
  const e=editing;
  const [currency,setCurrency]=useState(e?.currency||"usd");
  const [amount,setAmount]=useState(e?String(e.amount||""):"");
  const [category,setCategory]=useState(e?.category||"");
  const [note,setNote]=useState(e?.note||"");
  const [affectsBalance,setAffectsBalance]=useState(e?.affectsBalance!==false);
  const categories=["بنزين","أكل","صيانة","إنترنت","كهرباء","إيجار","أخرى"];
  const valid=parseFloat(amount)>0;
  const amt=parseFloat(amount)||0;

  const save=()=>{
    const expense={id:e?e.id:uid(),currency,amount:amt,category:category.trim(),note:note.trim(),createdAt:e?e.createdAt:Date.now(),byName:currentUser?.displayName||"",affectsBalance};
    persist(prev=>({...prev,expenses:e?prev.expenses.map(ex=>ex.id===e.id?expense:ex):[...(prev.expenses||[]),expense]}));
    showToast(e?"تم تعديل المصروف ✓":"تم حفظ المصروف ✓"); onBack();
  };

  return (
    <div>
      <TopBar title={e?"تعديل المصروف":"إضافة مصروف"} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <Field label="العملة"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
        <Field label={currency==="usd"?"المبلغ ($)":"المبلغ (ألف ل.ل)"}><AmountInput currency={currency} value={amount} onChange={setAmount} /></Field>
        <Field label="النوع / الفئة">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
            {categories.map(c=><button key={c} onClick={()=>setCategory(c)} style={{ padding:"8px 14px", borderRadius:20, border:`1px solid ${category===c?COLORS.red:COLORS.border}`, background:category===c?`${COLORS.red}20`:"transparent", color:category===c?COLORS.red:COLORS.textDim, fontWeight:600, fontSize:13, cursor:"pointer" }}>{c}</button>)}
          </div>
          <input style={inputStyle} value={category} onChange={e=>setCategory(e.target.value)} placeholder="أو اكتب نوع مخصص..." />
        </Field>
        <Field label="هل يخصم من الرصيد؟">
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAffectsBalance(true)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:affectsBalance?COLORS.red:COLORS.bgCard2, color:affectsBalance?"#fff":COLORS.textDim }}>✓ نعم، يخصم</button>
            <button onClick={()=>setAffectsBalance(false)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${COLORS.border}`, fontWeight:700, cursor:"pointer", background:!affectsBalance?COLORS.bgCard2:"transparent", color:COLORS.textDim }}>لا يخصم</button>
          </div>
        </Field>
        <Field label="ملاحظات (اختياري)"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظات..." /></Field>
        <SaveBtn disabled={!valid} onClick={save} color={COLORS.red} label={e?"حفظ التعديلات":"حفظ المصروف"} />
      </div>
    </div>
  );
}

function DebtsScreen({ data, persist, showToast, goTo, rate, onEdit, onPay, onBack }) {
  const debts=data.personalDebts||[];
  const owedByMe=debts.filter(d=>d.direction==="owedByMe");
  const owedToMe=debts.filter(d=>d.direction==="owedToMe");
  const totalOwedByMeUSD=owedByMe.filter(d=>d.currency==="usd").reduce((s,d)=>{const p=(d.payments||[]).reduce((a,x)=>a+(x.amount||0),0);return s+Math.max(0,d.amount-p);},0);
  const totalOwedToMeUSD=owedToMe.filter(d=>d.currency==="usd").reduce((s,d)=>{const p=(d.payments||[]).reduce((a,x)=>a+(x.amount||0),0);return s+Math.max(0,d.amount-p);},0);
  const deleteDebt=(id)=>{
    persist(prev=>({...prev,personalDebts:(prev.personalDebts||[]).filter(d=>d.id!==id)}));
    showToast("تم حذف الدين");
  };
  return (
    <div>
      <TopBar title="الديون الشخصية" onBack={onBack} right={<button onClick={()=>goTo("debts","add")} style={{ background:COLORS.orange, border:"none", borderRadius:10, padding:"8px 12px", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>+ جديد</button>} />
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <div style={{ flex:1, background:`${COLORS.red}15`, border:`1px solid ${COLORS.red}30`, borderRadius:16, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ color:COLORS.red, fontSize:11, fontWeight:700, marginBottom:4 }}>💸 ديون عليّ</div>
            <div style={{ color:COLORS.text, fontSize:18, fontWeight:800 }}>${fmt(totalOwedByMeUSD)}</div>
          </div>
          <div style={{ flex:1, background:`${COLORS.green}15`, border:`1px solid ${COLORS.green}30`, borderRadius:16, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ color:COLORS.green, fontSize:11, fontWeight:700, marginBottom:4 }}>💰 ديون لي</div>
            <div style={{ color:COLORS.text, fontSize:18, fontWeight:800 }}>${fmt(totalOwedToMeUSD)}</div>
          </div>
        </div>
        <button onClick={()=>goTo("debts","add")} style={{ width:"100%", background:`${COLORS.orange}20`, border:`1px solid ${COLORS.orange}40`, borderRadius:14, padding:"14px", color:COLORS.orange, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Plus size={18}/> إضافة دين شخصي
        </button>
        {owedByMe.length>0&&(<><div style={{ fontSize:14, fontWeight:800, color:COLORS.red, marginBottom:8 }}>💸 ديون عليّ</div><div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>{owedByMe.map(d=><DebtCard key={d.id} debt={d} onDelete={()=>deleteDebt(d.id)} onEdit={()=>onEdit(d)} onPay={()=>onPay(d)} />)}</div></>)}
        {owedToMe.length>0&&(<><div style={{ fontSize:14, fontWeight:800, color:COLORS.green, marginBottom:8 }}>💰 ديون لي</div><div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>{owedToMe.map(d=><DebtCard key={d.id} debt={d} onDelete={()=>deleteDebt(d.id)} onEdit={()=>onEdit(d)} onPay={()=>onPay(d)} />)}</div></>)}
        {debts.length===0&&<div style={{ textAlign:"center", color:COLORS.textFaint, padding:"40px 0" }}>لا توجد ديون شخصية</div>}
      </div>
    </div>
  );
}

function DebtCard({ debt, onDelete, onEdit, onPay }) {
  const [open,setOpen]=useState(false);
  const isUSD=debt.currency==="usd";
  const paid=(debt.payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const remaining=Math.max(0,debt.amount-paid);
  const isSettled=remaining<=0;
  const color=debt.direction==="owedByMe"?COLORS.red:COLORS.green;
  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${isSettled?COLORS.green:COLORS.border}`, borderRadius:14, overflow:"hidden", opacity:isSettled?0.75:1 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff" }}>{debt.name.slice(0,1)}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{debt.name}</div>
            <div style={{ fontSize:11, color:COLORS.textFaint }}>{isSettled?"✅ مسدّد":`متبقي: ${isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`}`}</div>
          </div>
        </div>
        <div style={{ fontWeight:800, color, fontSize:15 }}>{isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`}</div>
      </div>
      {open&&(
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          <Row label="المبلغ الكلي" value={isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`} valueColor={color} />
          <Row label="المدفوع" value={isUSD?`$${fmt(paid)}`:`${fmt(paid)} ألف ل.ل`} valueColor={COLORS.green} />
          <Row label="المتبقي" value={isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`} valueColor={remaining>0?COLORS.orange:COLORS.green} />
          {debt.note&&<Row label="ملاحظة" value={debt.note} />}
          {(debt.payments||[]).length>0&&(
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, fontWeight:700, color:COLORS.textDim, marginBottom:4 }}>الدفعات:</div>
              {debt.payments.map((p,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"2px 0" }}><span style={{ color:COLORS.textFaint }}>{new Date(p.date).toLocaleDateString("ar-LB")}</span><span style={{ color:COLORS.green, fontWeight:700 }}>{isUSD?`$${fmt(p.amount)}`:`${fmt(p.amount)} ألف ل.ل`}</span></div>)}
            </div>
          )}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            {!isSettled&&<button onClick={onPay} style={{ flex:1, background:COLORS.blue, border:"none", borderRadius:8, padding:"9px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>تسديد دفعة</button>}
            <button onClick={onEdit} style={{ background:"none", border:"none", color:COLORS.blue, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Edit3 size={14}/> تعديل</button>
            <button onClick={onDelete} style={{ background:"none", border:"none", color:COLORS.red, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Trash2 size={14}/> حذف</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DebtForm({ data, persist, showToast, editing, onBack, rate }) {
  const e=editing;
  const [currency,setCurrency]=useState(e?.currency||"usd");
  const [direction,setDirection]=useState(e?.direction||"owedByMe");
  const [name,setName]=useState(e?.name||"");
  const [amount,setAmount]=useState(e?String(e.amount||""):"");
  const [note,setNote]=useState(e?.note||"");
  const [affectsBalance,setAffectsBalance]=useState(e?.affectsBalance!==false);
  const valid=name.trim()&&parseFloat(amount)>0;

  const save=()=>{
    const amt=parseFloat(amount)||0;
    const debt={id:e?e.id:uid(),currency,direction,name:name.trim(),amount:amt,note:note.trim(),createdAt:e?e.createdAt:Date.now(),payments:e?e.payments:[],affectsBalance};
    persist(prev=>({...prev,personalDebts:e?prev.personalDebts.map(d=>d.id===e.id?debt:d):[...(prev.personalDebts||[]),debt]}));
    showToast(e?"تم تعديل الدين ✓":"تم إضافة الدين ✓"); onBack();
  };

  return (
    <div>
      <TopBar title={e?"تعديل الدين":"إضافة دين شخصي"} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <Field label="نوع الدين">
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setDirection("owedByMe")} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:direction==="owedByMe"?COLORS.red:COLORS.bgCard2, color:direction==="owedByMe"?"#fff":COLORS.textDim }}>💸 دين عليّ</button>
            <button onClick={()=>setDirection("owedToMe")} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:direction==="owedToMe"?COLORS.green:COLORS.bgCard2, color:direction==="owedToMe"?"#fff":COLORS.textDim }}>💰 دين لي</button>
          </div>
        </Field>
        <Field label="العملة"><CurrencyToggle value={currency} onChange={setCurrency} /></Field>
        <Field label="اسم الشخص"><input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: أحمد" autoFocus /></Field>
        <Field label={currency==="usd"?"المبلغ ($)":"المبلغ (ألف ل.ل)"}><AmountInput currency={currency} value={amount} onChange={setAmount} /></Field>
        <Field label="هل يؤثر على الرصيد الكلي؟">
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAffectsBalance(true)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", fontWeight:700, cursor:"pointer", background:affectsBalance?(direction==="owedByMe"?COLORS.red:COLORS.green):COLORS.bgCard2, color:affectsBalance?"#fff":COLORS.textDim, fontSize:13 }}>
              {direction==="owedByMe"?"✓ يُضاف للرصيد (استلمته)":"✓ يُضاف للرصيد"}
            </button>
            <button onClick={()=>setAffectsBalance(false)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${COLORS.border}`, fontWeight:700, cursor:"pointer", background:!affectsBalance?COLORS.bgCard2:"transparent", color:COLORS.textDim, fontSize:13 }}>
              📝 تسجيل فقط
            </button>
          </div>
          <div style={{ fontSize:11, color:COLORS.textFaint, marginTop:6 }}>
            {affectsBalance
              ? direction==="owedByMe"
                ? "المبلغ استلمته وسيُضاف لرصيدك — عند السداد يُخصم"
                : "سيُضاف المبلغ لرصيدك فوراً"
              : "يُسجّل فقط بدون تأثير على الرصيد"}
          </div>
        </Field>
        <Field label="ملاحظة (اختياري)"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder="سبب الدين..." /></Field>
        <SaveBtn disabled={!valid} onClick={save} color={direction==="owedByMe"?COLORS.red:COLORS.green} label={e?"حفظ التعديلات":"إضافة الدين"} />
      </div>
    </div>
  );
}

function PayDebtScreen({ debt, persist, showToast, onBack }) {
  const [amount,setAmount]=useState("");
  const isUSD=debt.currency==="usd";
  const paid=(debt.payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const remaining=Math.max(0,debt.amount-paid);
  const valid=parseFloat(amount)>0&&parseFloat(amount)<=remaining;
  const save=()=>{
    const amt=parseFloat(amount)||0;
    persist(prev=>({...prev,personalDebts:prev.personalDebts.map(d=>d.id===debt.id?{...d,payments:[...(d.payments||[]),{amount:amt,date:Date.now()}]}:d)}));
    showToast("تم تسجيل الدفعة ✓"); onBack();
  };
  return (
    <div>
      <TopBar title={`تسديد — ${debt.name}`} onBack={onBack} />
      <div style={{ padding:"0 16px" }}>
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:16 }}>
          <Row label="المبلغ الكلي" value={isUSD?`$${fmt(debt.amount)}`:`${fmt(debt.amount)} ألف ل.ل`} />
          <div style={{ height:8 }} />
          <Row label="المدفوع" value={isUSD?`$${fmt(paid)}`:`${fmt(paid)} ألف ل.ل`} valueColor={COLORS.green} />
          <div style={{ height:8 }} />
          <Row label="المتبقي" value={isUSD?`$${fmt(remaining)}`:`${fmt(remaining)} ألف ل.ل`} valueColor={COLORS.orange} />
        </div>
        <Field label={isUSD?"مبلغ الدفعة ($)":"مبلغ الدفعة (ألف ل.ل)"}><AmountInput currency={debt.currency} value={amount} onChange={setAmount} /></Field>
        <SaveBtn disabled={!valid} onClick={save} color={COLORS.blue} label="تسجيل الدفعة" />
      </div>
    </div>
  );
}

function SettingsScreen({ data, persist, showToast, onLogout, rate, currentUser, balanceUSD, balanceLBP }) {
  const [editingRate,setEditingRate]=useState(false);
  const [rateInput,setRateInput]=useState(String(data.exchangeRate||89000));
  const [showConvert,setShowConvert]=useState(false);
  const [convertAmount,setConvertAmount]=useState("");
  const [convertDir,setConvertDir]=useState("usd_to_lbp");
  const [showPassEditor,setShowPassEditor]=useState(false);
  const [editUsers,setEditUsers]=useState(()=>(data.users||DEFAULT_USERS).map(u=>({...u})));

  const saveRate=()=>{ const r=parseFloat(rateInput); if(r>0){persist(prev=>({...prev,exchangeRate:r}));showToast("تم تحديث سعر الصرف ✓");} setEditingRate(false); };
  const amt=parseFloat(convertAmount)||0;
  const convertResult=convertDir==="usd_to_lbp"?amt*rate:amt*1000/rate;

  const confirmConvert=()=>{
    if(amt<=0) return;
    const conversion={ id:uid(), dir:convertDir, amount:amt, rate, createdAt:Date.now() };
    persist(prev=>({...prev, conversions:[...(prev.conversions||[]), conversion]}));
    showToast("تم التحويل ✓"); setConvertAmount("");
  };

  const savePasswords=()=>{ persist(prev=>({...prev,users:editUsers})); showToast("تم حفظ كلمات المرور ✓"); setShowPassEditor(false); };
  const clearAllData=()=>{ const clean={...DEFAULT_DATA,users:data.users,exchangeRate:data.exchangeRate}; persist(()=>clean); showToast("تم مسح كل البيانات ✓"); };

  return (
    <div>
      <TopBar title="الإعدادات" />
      <div style={{ padding:"0 16px" }}>
        <div style={{ background:`linear-gradient(135deg, ${COLORS.bgCard}, ${COLORS.bgCard2})`, border:`1px solid ${COLORS.border}`, borderRadius:18, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, color:COLORS.textDim, fontWeight:700, marginBottom:12 }}>الرصيد الحالي</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, background:`${COLORS.green}15`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.green, fontWeight:700, marginBottom:4 }}>$ دولار</div>
              <div style={{ fontSize:18, fontWeight:800, color:COLORS.text }}>${fmt(balanceUSD)}</div>
            </div>
            <div style={{ flex:1, background:`${COLORS.blue}15`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.blue, fontWeight:700, marginBottom:4 }}>ل.ل ليرة</div>
              <div style={{ fontSize:15, fontWeight:800, color:COLORS.text }}>{fmtLBP(balanceLBP)}</div>
            </div>
          </div>
        </div>

        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:showConvert?16:0 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>🔄 تحويل العملة</div>
            <button onClick={()=>setShowConvert(s=>!s)} style={{ background:`${COLORS.blue}20`, border:`1px solid ${COLORS.blue}40`, borderRadius:8, padding:"6px 12px", color:COLORS.blue, fontWeight:700, fontSize:13, cursor:"pointer" }}>{showConvert?"إخفاء":"فتح"}</button>
          </div>
          {showConvert&&(
            <>
              <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:12, textAlign:"center" }}>1$ = {fmtLBP(rate)} ل.ل</div>
              <div style={{ display:"flex", gap:8, marginBottom:12, background:COLORS.bgCard2, borderRadius:10, padding:4 }}>
                <button onClick={()=>setConvertDir("usd_to_lbp")} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:convertDir==="usd_to_lbp"?COLORS.green:"transparent", color:convertDir==="usd_to_lbp"?"#fff":COLORS.textDim, fontSize:13 }}>$ → ل.ل</button>
                <button onClick={()=>setConvertDir("lbp_to_usd")} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", fontWeight:700, cursor:"pointer", background:convertDir==="lbp_to_usd"?COLORS.blue:"transparent", color:convertDir==="lbp_to_usd"?"#fff":COLORS.textDim, fontSize:13 }}>ل.ل → $</button>
              </div>
              <Field label={convertDir==="usd_to_lbp"?"المبلغ بالدولار":"المبلغ بالليرة (ألف)"}>
                <input style={inputStyle} type="number" inputMode="decimal" value={convertAmount} onChange={e=>setConvertAmount(e.target.value)} placeholder="0" />
              </Field>
              {amt>0&&(
                <div style={{ background:COLORS.bgCard2, borderRadius:12, padding:14, marginBottom:12, textAlign:"center" }}>
                  <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:6 }}>النتيجة</div>
                  <div style={{ fontSize:22, fontWeight:800, color:convertDir==="usd_to_lbp"?COLORS.blue:COLORS.green }}>{convertDir==="usd_to_lbp"?`${fmtLBP(convertResult)} ل.ل`:`$${fmt(convertResult)}`}</div>
                </div>
              )}
              <SaveBtn onClick={confirmConvert} disabled={amt<=0} label="تأكيد التحويل" color={COLORS.blue} />
            </>
          )}
        </div>

        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>💱 سعر الصرف</div>
          {editingRate?(
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...inputStyle, flex:1 }} type="number" value={rateInput} onChange={e=>setRateInput(e.target.value)} autoFocus />
              <button onClick={saveRate} style={{ background:COLORS.green, border:"none", borderRadius:10, padding:"0 16px", color:"#fff", cursor:"pointer" }}><Check size={18}/></button>
              <button onClick={()=>setEditingRate(false)} style={{ background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"0 12px", color:COLORS.textDim, cursor:"pointer" }}><X size={18}/></button>
            </div>
          ):(
            <button onClick={()=>{setRateInput(String(data.exchangeRate||89000));setEditingRate(true);}} style={{ display:"flex", justifyContent:"space-between", width:"100%", background:COLORS.bgCard2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 14px", color:COLORS.text, cursor:"pointer", fontSize:15 }}>
              <span>1$ = {fmtLBP(data.exchangeRate||89000)} ل.ل</span>
              <Edit3 size={16} color={COLORS.textDim}/>
            </button>
          )}
        </div>

        {currentUser?.role==="admin" && (
          <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:showPassEditor?16:0 }}>
              <div style={{ fontWeight:800, fontSize:14 }}>🔑 كلمات المرور</div>
              <button onClick={()=>{ setEditUsers((data.users||DEFAULT_USERS).map(u=>({...u}))); setShowPassEditor(s=>!s); }} style={{ background:`${COLORS.orange}20`, border:`1px solid ${COLORS.orange}40`, borderRadius:8, padding:"6px 12px", color:COLORS.orange, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {showPassEditor?"إلغاء":"تعديل"}
              </button>
            </div>
            {showPassEditor && (
              <>
                {editUsers.map((u,i)=>(
                  <div key={u.id} style={{ background:COLORS.bgCard2, borderRadius:12, padding:14, marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:COLORS.text, marginBottom:10 }}>
                      {u.displayName} <span style={{ fontSize:11, color:COLORS.textFaint }}>({u.username})</span>
                    </div>
                    <Field label="اسم المستخدم">
                      <input style={inputStyle} value={u.username} onChange={ev=>{const nu=[...editUsers];nu[i]={...nu[i],username:ev.target.value};setEditUsers(nu);}} autoCapitalize="none" />
                    </Field>
                    <Field label="كلمة المرور الجديدة">
                      <input style={inputStyle} type="password" value={u.password} onChange={ev=>{const nu=[...editUsers];nu[i]={...nu[i],password:ev.target.value};setEditUsers(nu);}} placeholder="أدخل كلمة المرور" />
                    </Field>
                    <Field label="الاسم الظاهر">
                      <input style={inputStyle} value={u.displayName} onChange={ev=>{const nu=[...editUsers];nu[i]={...nu[i],displayName:ev.target.value};setEditUsers(nu);}} />
                    </Field>
                  </div>
                ))}
                <SaveBtn onClick={savePasswords} label="حفظ كلمات المرور ✓" color={COLORS.orange} />
              </>
            )}
          </div>
        )}

        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:8 }}>👥 مشاركة التطبيق</div>
          <div style={{ fontSize:12, color:COLORS.textDim, lineHeight:1.8 }}>
            أرسل لزوجتك:<br/>
            🔗 <span style={{ color:COLORS.green, fontWeight:700 }}>https://zidanammar7111-cpu.github.io</span><br/>
            اسم المستخدم: <span style={{ color:COLORS.text, fontWeight:700 }}>wife</span><br/>
            كلمة المرور: <span style={{ color:COLORS.text, fontWeight:700 }}>1234</span>
          </div>
        </div>

        {currentUser?.role==="admin" && (
          <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.red}40`, borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:6, color:COLORS.red }}>⚠️ مسح كل البيانات</div>
            <div style={{ fontSize:12, color:COLORS.textFaint, marginBottom:12 }}>سيمسح جميع الطلبات والشركات والمصروفات والديون والتحويلات.</div>
            <button onClick={clearAllData} style={{ width:"100%", background:`${COLORS.red}20`, border:`1px solid ${COLORS.red}`, borderRadius:10, padding:"13px", color:COLORS.red, fontWeight:800, fontSize:14, cursor:"pointer" }}>
              🗑️ مسح كل البيانات
            </button>
          </div>
        )}

        <button onClick={onLogout} style={{ width:"100%", background:COLORS.red, border:"none", borderRadius:14, padding:"14px", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", marginBottom:20 }}>
          🔒 تسجيل الخروج
        </button>
      </div>
    </div>
  );
  }
