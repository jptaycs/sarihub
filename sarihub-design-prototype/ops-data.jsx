// Shared ops data + helpers for SariHub admin/driver prototype.

const ROUTES = ['Tagbac', 'Iyam', 'Pagbilao'];

const OPS_PRODUCTS = [
  { id: 'sibuyas-pula', tag: 'Sibuyas pula', en: 'Red onion', unit: '1 kg', last: 120, today: 128, stock: 'in', notes: 'Maliit na supply' },
  { id: 'sibuyas-puti', tag: 'Sibuyas puti', en: 'White onion', unit: '1 kg', last: 145, today: 145, stock: 'in', notes: '' },
  { id: 'bawang', tag: 'Bawang', en: 'Garlic', unit: '1 kg', last: 240, today: 220, stock: 'in', notes: 'Bagong batch · Ilocos' },
  { id: 'itlog-med', tag: 'Itlog · medium', en: 'Eggs medium', unit: '1 tray', last: 260, today: 260, stock: 'in', notes: '' },
  { id: 'itlog-lg', tag: 'Itlog · large', en: 'Eggs large', unit: '1 tray', last: 295, today: 305, stock: 'low', notes: 'May delivery 11 AM' },
  { id: 'kamatis', tag: 'Kamatis', en: 'Tomatoes', unit: '1 kg', last: 75, today: 80, stock: 'in', notes: '' },
  { id: 'tilapia', tag: 'Tilapia · live', en: 'Live tilapia', unit: '1 kg', last: 165, today: 160, stock: 'in', notes: '' },
  { id: 'galunggong', tag: 'Galunggong', en: 'Round scad', unit: '1 kg', last: 160, today: 154, stock: 'in', notes: '' },
  { id: 'bangus', tag: 'Bangus · medium', en: 'Milkfish', unit: '1 kg', last: 195, today: 195, stock: 'out', notes: 'Wala sa palengke' },
  { id: 'mantika', tag: 'Mantika', en: 'Cooking oil', unit: '1 L', last: 84, today: 88, stock: 'in', notes: '' },
];

const STOPS_TAGBAC = [
  { n: 1, store: 'Aling Bebang Tindahan',  addr: 'Brgy. Talao-talao, near chapel',  items: 6,  kg: 32, total: 480,  pay: 'suki',  phone: '0917-823-4501' },
  { n: 2, store: 'Mang Boyet Tindahan',     addr: 'Brgy. Talao-talao, corner store', items: 4,  kg: 18, total: 320,  pay: 'cash',  phone: '0917-823-4502' },
  { n: 3, store: 'Lola Pining Sari-sari',   addr: 'Tagbac Sur, beside the well',     items: 9,  kg: 46, total: 1180, pay: 'gcash', phone: '0917-823-4503' },
  { n: 4, store: 'JM Variety Store',        addr: 'Tagbac Sur, market road',         items: 5,  kg: 24, total: 540,  pay: 'suki',  phone: '0917-823-4504' },
  { n: 5, store: "Aling Marisa's Store",    addr: 'Tagbac Norte, beside court',      items: 5,  kg: 28, total: 640,  pay: 'suki',  phone: '0917-823-4505' },
  { n: 6, store: 'Sari-sari ni Ate Liza',   addr: 'Tagbac Norte, second alley',      items: 7,  kg: 35, total: 820,  pay: 'cash',  phone: '0917-823-4506' },
  { n: 7, store: 'Pinoy Mart Mini',         addr: 'Brgy. Iyam, transition zone',     items: 12, kg: 58, total: 1640, pay: 'suki',  phone: '0917-823-4507' },
  { n: 8, store: 'Tindahan ni Mang Pol',    addr: 'Brgy. Iyam, junction',            items: 3,  kg: 14, total: 280,  pay: 'cash',  phone: '0917-823-4508' },
];

// Items per stop — keyed by stop number, used by helper packing flow + driver detail
const STOP_ITEMS = {
  5: [
    { tag: 'Sibuyas pula', en: 'Red onion · 2 kg', kg: 2, price: 256 },
    { tag: 'Bawang', en: 'Garlic · ¼ kg', kg: 0.25, price: 58 },
    { tag: 'Itlog · medium', en: 'Eggs · 1 dz', kg: 0.8, price: 92 },
    { tag: 'Kamatis', en: 'Tomatoes · 1 kg', kg: 1, price: 80 },
    { tag: 'Galunggong', en: 'Round scad · 1 kg', kg: 1, price: 154 },
  ],
};

// Submitted-stage orders awaiting packing
const PACKING_QUEUE = [
  { id: 1287, store: "Aling Marisa's Store", route: 'Tagbac', stop: 5, items: 5, kg: 5.05, total: 640, pay: 'suki' },
  { id: 1286, store: 'Sari-sari ni Ate Liza', route: 'Tagbac', stop: 6, items: 7, kg: 7.2, total: 820, pay: 'cash' },
  { id: 1285, store: 'JM Variety Store', route: 'Tagbac', stop: 4, items: 5, kg: 4.8, total: 540, pay: 'suki' },
  { id: 1284, store: 'Lola Pining Sari-sari', route: 'Tagbac', stop: 3, items: 9, kg: 9.2, total: 1180, pay: 'gcash' },
  { id: 1283, store: 'Tindahan ni Mang Pol', route: 'Iyam', stop: 2, items: 3, kg: 2.8, total: 280, pay: 'cash' },
];

const ROUTE_SUMMARY = [
  { name: 'Tagbac', truck: 'Tamaraw 01', driver: 'Mang Renz', kg: 612, cap: 1000, stops: 18, status: 'Loaded · departing 5:55 AM', tone: 'success' },
  { name: 'Iyam', truck: 'Tamaraw 02', driver: 'Mang Onyok', kg: 884, cap: 1000, stops: 14, status: 'Packing · 88% capacity', tone: 'warning' },
  { name: 'Pagbilao', truck: 'Tamaraw 03', driver: 'Mang Lito', kg: 1080, cap: 1000, stops: 16, status: 'OVER CAPACITY · split required', tone: 'danger' },
];

const peso2 = (n) => `₱${Math.round(n).toLocaleString()}`;

Object.assign(window, {
  ROUTES, OPS_PRODUCTS, STOPS_TAGBAC, STOP_ITEMS,
  PACKING_QUEUE, ROUTE_SUMMARY, peso2,
});
