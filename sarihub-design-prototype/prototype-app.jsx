// SariHub interactive prototype — store-owner flow.
// State-driven: OTP → Home → Cart sheet → Confirmation, with real cart + suki balance.
// Bottom tab nav (Home / Orders / Suki / Account) within the app.

const { useState, useEffect, useRef, useMemo } = React;

// ---------- Catalog ----------
const CATALOG = [
  { id: 'sibuyas-pula', tag: 'Sibuyas pula', en: 'Red onion', cat: 'Sariwa',
    src: 'Dalahican mkt', t: '4:42 AM', dir: 'up', delta: 8, ph: 'sibuyas',
    units: [{ k: 'pc', label: '1 pc', price: 14 }, { k: 'kg', label: '1 kg', price: 128 }, { k: '5kg', label: '5 kg', price: 610 }] },
  { id: 'bawang', tag: 'Bawang', en: 'Garlic', cat: 'Sariwa',
    src: 'Dalahican mkt', t: '4:48 AM', dir: 'down', delta: 3, ph: 'bawang',
    units: [{ k: 'pc', label: '1 pc', price: 4 }, { k: '4kg', label: '¼ kg', price: 58 }, { k: 'kg', label: '1 kg', price: 220 }] },
  { id: 'itlog', tag: 'Itlog · medium', en: 'Eggs', cat: 'Sariwa',
    src: 'San Pablo farm', t: '5:10 AM', dir: 'flat', delta: 0, ph: 'itlog',
    units: [{ k: 'pc', label: '1 pc', price: 8 }, { k: 'dz', label: '1 dz', price: 92 }, { k: 'tray', label: '1 tray', price: 260 }] },
  { id: 'kamatis', tag: 'Kamatis', en: 'Tomatoes', cat: 'Sariwa',
    src: 'Dalahican mkt', t: '4:55 AM', dir: 'up', delta: 5, ph: 'kamatis',
    units: [{ k: '4kg', label: '¼ kg', price: 22 }, { k: 'kg', label: '1 kg', price: 80 }, { k: '5kg', label: '5 kg', price: 380 }] },
  { id: 'tilapia', tag: 'Tilapia · live', en: 'Live tilapia', cat: 'Sariwa',
    src: 'Lucena port', t: '5:24 AM', dir: 'flat', delta: 0, ph: 'tilapia',
    units: [{ k: 'kg', label: '1 kg', price: 160 }, { k: '3kg', label: '3 kg', price: 465 }, { k: '5kg', label: '5 kg', price: 760 }] },
  { id: 'galunggong', tag: 'Galunggong', en: 'Round scad', cat: 'Sariwa',
    src: 'Lucena port', t: '5:18 AM', dir: 'down', delta: 6, ph: 'gg',
    units: [{ k: 'kg', label: '1 kg', price: 154 }, { k: '3kg', label: '3 kg', price: 450 }, { k: '5kg', label: '5 kg', price: 720 }] },
  { id: 'asin', tag: 'Asin', en: 'Salt', cat: 'Pampalasa',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'asin',
    units: [{ k: 'pc', label: '500 g', price: 18 }, { k: 'kg', label: '1 kg', price: 32 }] },
  { id: 'patis', tag: 'Patis', en: 'Fish sauce', cat: 'Pampalasa',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'patis',
    units: [{ k: 'sm', label: '350 ml', price: 38 }, { k: 'lg', label: '1 L', price: 95 }] },
  { id: 'sardinas', tag: 'Sardinas', en: 'Sardines', cat: 'De lata',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'sard',
    units: [{ k: 'pc', label: '155 g', price: 24 }, { k: 'pck', label: '6-pack', price: 138 }] },
  { id: 'corned', tag: 'Corned beef', en: 'Corned beef', cat: 'De lata',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'cb',
    units: [{ k: 'pc', label: '150 g', price: 42 }, { k: 'pck', label: '6-pack', price: 240 }] },
  { id: 'pansit-canton', tag: 'Pansit canton', en: 'Stir-fry noodles', cat: 'Pansit',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'pc',
    units: [{ k: 'pc', label: '227 g', price: 28 }, { k: 'pck', label: '10-pack', price: 260 }] },
  { id: 'bihon', tag: 'Bihon', en: 'Rice noodles', cat: 'Pansit',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'bh',
    units: [{ k: 'pc', label: '454 g', price: 52 }, { k: 'pck', label: '6-pack', price: 295 }] },
  { id: 'kape', tag: 'Kape · 3-in-1', en: '3-in-1 coffee', cat: "Kape't gatas",
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'kp',
    units: [{ k: 'pck', label: '30 sachets', price: 168 }, { k: 'box', label: '5 packs', price: 780 }] },
  { id: 'gatas', tag: 'Gatas · evaporated', en: 'Evaporated milk', cat: "Kape't gatas",
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'gt',
    units: [{ k: 'pc', label: '370 ml', price: 38 }, { k: 'pck', label: '6-pack', price: 220 }] },
  { id: 'mantika', tag: 'Mantika', en: 'Cooking oil', cat: 'Sangkap',
    src: 'Warehouse', t: '—', dir: 'up', delta: 4, ph: 'mn',
    units: [{ k: 'pc', label: '1 L pouch', price: 88 }, { k: 'lg', label: '1 gal', price: 320 }] },
  { id: 'toyo', tag: 'Toyo', en: 'Soy sauce', cat: 'Sangkap',
    src: 'Warehouse', t: '—', dir: 'flat', delta: 0, ph: 'ty',
    units: [{ k: 'sm', label: '385 ml', price: 28 }, { k: 'lg', label: '1 L', price: 68 }] },
];

const CATEGORIES = ['Sariwa', 'Pampalasa', 'De lata', 'Pansit', "Kape't gatas", 'Sangkap'];

const SEED_ORDERS = [
  { id: 1273, when: 'Lunes · 9:12 PM', whenSort: -1, count: 7, total: 1180, status: 'Delivered', tone: 'success',
    items: [
      { name: 'Sibuyas pula · 2 kg', price: 256 },
      { name: 'Bawang · ½ kg', price: 116 },
      { name: 'Itlog medium · 2 dz', price: 184 },
      { name: 'Kamatis · 1 kg', price: 80 },
      { name: 'Sardinas · 6-pack', price: 138 },
      { name: 'Mantika · 1 L', price: 88 },
      { name: 'Toyo · 1 L', price: 68 },
    ], pay: 'Suki credit' },
  { id: 1260, when: 'Sabado · 8:34 PM', whenSort: -2, count: 4, total: 420, status: 'Settled', tone: 'neutral',
    items: [
      { name: 'Sibuyas pula · 1 kg', price: 128 },
      { name: 'Bawang · ¼ kg', price: 58 },
      { name: 'Galunggong · 1 kg', price: 154 },
      { name: 'Patis · 350 ml', price: 38 },
    ], pay: 'GCash' },
  { id: 1245, when: 'Huwebes · 10:02 PM', whenSort: -3, count: 9, total: 1450, status: 'Settled', tone: 'neutral',
    items: [], pay: 'Suki credit' },
];

const SEED_LEDGER = [
  { d: 'Lunes',     desc: 'Bayad · GCash',           amt: 1200, bal: 3680 },
  { d: 'Lunes',     desc: 'Order #1273',             amt: -1180, bal: 4880 },
  { d: 'Sabado',    desc: 'Order #1260',             amt: -420,  bal: 3700 },
  { d: 'Biyernes',  desc: 'Bayad · cash sa driver',  amt: 800,   bal: 3280 },
  { d: 'Huwebes',   desc: 'Order #1245',             amt: -1450, bal: 4080 },
];

// ---------- Helpers ----------
const peso = (n) => `₱${Math.round(n).toLocaleString()}`;
const STORE_NAME = "Aling Marisa's Store";
const SUKI_LIMIT = 5000;

// ---------- Root App ----------
const PrototypeApp = () => {
  const [screen, setScreen] = useState('otp-phone'); // otp-phone | otp-code | app
  const [phone, setPhone] = useState('917 845 2310');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState(false);

  // App state
  const [tab, setTab] = useState('home'); // home | orders | suki | account
  const [cat, setCat] = useState('Sariwa');
  const [cart, setCart] = useState({}); // { productId: { unitKey, qty } }
  const [orders, setOrders] = useState(SEED_ORDERS);
  const [sukiUsed, setSukiUsed] = useState(2200); // pre-existing balance
  const [ledger, setLedger] = useState(SEED_LEDGER);
  const [paymentMethod, setPaymentMethod] = useState('suki'); // default for this store
  const [cartOpen, setCartOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQty, setShowQty] = useState(null); // productId
  const [showToast, setShowToast] = useState(null);
  const [offline, setOffline] = useState(false);
  const [cutoffPassed, setCutoffPassed] = useState(false);
  const [showStepperHint, setShowStepperHint] = useState(false);

  // Derived
  const cartItems = useMemo(() => Object.entries(cart).map(([pid, { unitKey, qty }]) => {
    const p = CATALOG.find(x => x.id === pid);
    const u = p?.units.find(x => x.k === unitKey);
    return p && u ? { pid, p, u, qty, lineTotal: u.price * qty } : null;
  }).filter(Boolean), [cart]);

  const cartTotal = cartItems.reduce((s, x) => s + x.lineTotal, 0);
  const cartCount = cartItems.reduce((s, x) => s + x.qty, 0);
  const sukiAfterOrder = sukiUsed + (paymentMethod === 'suki' ? cartTotal : 0);
  const sukiExceeded = sukiAfterOrder > SUKI_LIMIT;

  const toast = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2200);
  };

  // ---------- OTP handlers ----------
  const sendCode = () => {
    if (phone.replace(/\D/g, '').length < 10) return;
    setOtpError(false);
    setCode('');
    setScreen('otp-code');
  };

  const enterDigit = (d) => {
    if (otpError) setOtpError(false);
    if (code.length >= 6) return;
    const next = code + d;
    setCode(next);
    if (next.length === 6) {
      setTimeout(() => {
        if (next === '482741' || next === '111111' || true) {
          setScreen('app');
        } else {
          setOtpError(true);
        }
      }, 350);
    }
  };

  const delDigit = () => setCode(code.slice(0, -1));

  // ---------- Cart handlers ----------
  const tapUnit = (productId, unitKey) => {
    setCart(prev => {
      const existing = prev[productId];
      if (existing && existing.unitKey === unitKey) {
        // Same unit tapped — open qty stepper
        setShowQty(productId);
        return prev;
      }
      // New product or switching unit: add 1
      const wasEmpty = !prev[productId];
      if (wasEmpty && Object.keys(prev).length === 0) {
        // First add — show subtle hint
        setShowStepperHint(true);
        setTimeout(() => setShowStepperHint(false), 2400);
      }
      return { ...prev, [productId]: { unitKey, qty: 1 } };
    });
  };

  const setQty = (productId, qty) => {
    setCart(prev => {
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...prev[productId], qty } };
    });
  };

  const removeItem = (productId) => {
    setCart(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const placeOrder = () => {
    if (sukiExceeded && paymentMethod === 'suki') return;
    if (cartItems.length === 0) return;

    const newOrder = {
      id: 1287,
      when: 'Today · ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      whenSort: 0,
      count: cartCount,
      total: cartTotal,
      status: 'Sent',
      tone: 'action',
      pay: paymentMethod === 'suki' ? 'Suki credit' : paymentMethod === 'cash' ? 'Cash on delivery' : 'GCash',
      items: cartItems.map(x => ({
        name: `${x.p.tag} · ${x.u.label.replace(/^1 /, '')}${x.qty > 1 ? ` × ${x.qty}` : ''}`,
        price: x.lineTotal,
      })),
    };

    setOrders([newOrder, ...orders]);
    if (paymentMethod === 'suki') {
      setSukiUsed(sukiUsed + cartTotal);
      setLedger([
        { d: 'Today', desc: `Order #${newOrder.id}`, amt: -cartTotal, bal: SUKI_LIMIT - (sukiUsed + cartTotal) + ledger[0].bal - (SUKI_LIMIT - sukiUsed) },
        ...ledger,
      ]);
    }
    setCartOpen(false);
    setTimeout(() => {
      setShowConfirm(true);
      setCart({});
    }, 280);
  };

  const reorderFromHistory = (orderId) => {
    // Re-add some plausible items
    const sample = {
      'sibuyas-pula': { unitKey: 'kg', qty: 1 },
      'bawang': { unitKey: '4kg', qty: 1 },
      'itlog': { unitKey: 'dz', qty: 1 },
    };
    setCart(sample);
    setTab('home');
    toast('Naidagdag sa cart');
  };

  // ---------- Render ----------
  return (
    <DeviceFrame>
      {screen === 'otp-phone' && <OtpPhone phone={phone} setPhone={setPhone} onSubmit={sendCode}/>}
      {screen === 'otp-code' && (
        <OtpCode
          phone={phone}
          code={code}
          error={otpError}
          onDigit={enterDigit}
          onDelete={delDigit}
          onBack={() => setScreen('otp-phone')}
        />
      )}
      {screen === 'app' && (
        <AppShell
          tab={tab} setTab={setTab}
          cartCount={cartCount}
          banner={offline ? 'offline' : cutoffPassed ? 'cutoff' : sukiExceeded ? 'suki' : null}
        >
          {tab === 'home' && (
            <HomeTab
              cat={cat} setCat={setCat}
              cart={cart}
              tapUnit={tapUnit}
              cartCount={cartCount}
              cartTotal={cartTotal}
              sukiUsed={sukiUsed}
              sukiExceeded={sukiExceeded}
              cutoffPassed={cutoffPassed}
              offline={offline}
              onPlaceOrder={() => setCartOpen(true)}
              showStepperHint={showStepperHint}
            />
          )}
          {tab === 'orders' && <OrdersTab orders={orders} reorder={reorderFromHistory}/>}
          {tab === 'suki' && <SukiTab used={sukiUsed} ledger={ledger}/>}
          {tab === 'account' && (
            <AccountTab
              offline={offline} setOffline={setOffline}
              cutoffPassed={cutoffPassed} setCutoffPassed={setCutoffPassed}
              onSignOut={() => { setScreen('otp-phone'); setCart({}); setTab('home'); }}
            />
          )}
        </AppShell>
      )}

      {/* Modals */}
      {cartOpen && (
        <CartSheet
          items={cartItems}
          total={cartTotal}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          sukiExceeded={sukiExceeded}
          sukiUsed={sukiUsed}
          onClose={() => setCartOpen(false)}
          onRemove={removeItem}
          onUpdateQty={setQty}
          onConfirm={placeOrder}
        />
      )}
      {showConfirm && (
        <ConfirmModal
          order={orders[0]}
          onReorder={() => { setShowConfirm(false); setTab('home'); }}
          onHistory={() => { setShowConfirm(false); setTab('orders'); }}
        />
      )}
      {showQty !== null && (
        <QtyModal
          productId={showQty}
          cart={cart}
          setQty={setQty}
          onClose={() => setShowQty(null)}
        />
      )}
      {showToast && <Toast msg={showToast}/>}
    </DeviceFrame>
  );
};

window.PrototypeApp = PrototypeApp;
