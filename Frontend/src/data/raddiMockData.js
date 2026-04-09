// ─── Raddi Master Mock Data ──────────────────────────────────────────────────
// 35 realistic rows covering Gurgaon sectors/societies with all required cols

export const RADDI_ITEM_LABELS = [
  'Newspaper',       // 1
  'Cardboard',       // 2
  'Plastic Bottles', // 3
  'Iron/Metal',      // 4
  'Glass',           // 5
  'E-Waste',         // 6
  'Aluminium',       // 7
  'Wood',            // 8
  'Other',           // 9
]

export const RADDI_ORDER_STATUSES  = ['Completed', 'Pending', 'Cancelled', 'Postponed']
export const RADDI_PAYMENT_STATUSES = ['Received', 'Yet to Receive', 'Write-off']
export const RADDI_DONOR_STATUSES  = ['Active', 'Pickup Due', 'At Risk', 'Churned']

// ── helpers ──────────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
let _id = 1
const nextId = () => `ORD${String(_id++).padStart(4, '0')}`

function makeRow({
  name, mobile, houseNo, society, sector, city = 'Gurgaon',
  pickupDate, orderDate, kabName, kabPhone,
  donorStatus, items, totalKg, totalAmount,
  paymentStatus, orderStatus,
}) {
  return {
    orderId: nextId(),
    mobile, name, houseNo, society, sector, city,
    pickupDate, orderDate,
    kabadiwalaName: kabName,
    kabadiwalaPhone: kabPhone,
    donorStatus,
    items,           // array of 9 numbers (kg per item)
    totalKg,
    totalAmount,
    paymentStatus,
    orderStatus,
  }
}

// ── 35 rows ──────────────────────────────────────────────────────────────────
export const raddiMasterData = [
  makeRow({ name:'Anjali Sharma',    mobile:'9876543210', houseNo:'A-101', society:'DLF Phase 1',           sector:'Sector 22',    pickupDate:'2026-03-10', orderDate:'2026-03-08', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[12,8,3,0,2,0,0,0,1],   totalKg:26,  totalAmount:780,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Ramesh Gupta',     mobile:'9123456780', houseNo:'B-45',  society:'Patel Enclave',         sector:'Sector 5',     pickupDate:'2026-03-01', orderDate:'2026-02-28', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[8,5,0,2,0,1,0,0,0],    totalKg:16,  totalAmount:480,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Sunita Verma',     mobile:'9988776655', houseNo:'C-12',  society:'Greenwood City',        sector:'Sector 45',    pickupDate:'2026-04-15', orderDate:'2026-04-12', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Pickup Due', items:[6,4,2,0,1,0,0,0,2],    totalKg:15,  totalAmount:450,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Vikas Mehra',      mobile:'9012345678', houseNo:'204',   society:'Vasant Kunj Apts',      sector:'DLF Phase 2',  pickupDate:'2025-12-05', orderDate:'2025-12-03', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Churned',    items:[0,0,0,0,0,0,0,0,0],    totalKg:0,   totalAmount:0,    paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Pooja Kapoor',     mobile:'9345678901', houseNo:'3B',    society:'Nirvana Country 1',     sector:'Sector 50',    pickupDate:'2026-03-20', orderDate:'2026-03-18', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[14,10,5,3,0,2,1,0,3],  totalKg:38,  totalAmount:1140, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Manoj Singh',      mobile:'9456789012', houseNo:'D-77',  society:'Sushant Lok 1',         sector:'Sector 46',    pickupDate:'2026-02-28', orderDate:'2026-02-26', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[20,15,0,8,4,0,2,0,0],  totalKg:49,  totalAmount:1470, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Kavita Sharma',    mobile:'9876001234', houseNo:'F-201', society:'Ardee City Block B',    sector:'Ardee City',   pickupDate:'2026-04-01', orderDate:'2026-03-30', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[9,7,4,0,2,1,0,0,1],    totalKg:24,  totalAmount:720,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Deepak Verma',     mobile:'9001122334', houseNo:'G-5',   society:'Malibu Towne Block C',  sector:'Malibu Towne', pickupDate:'2026-02-14', orderDate:'2026-02-12', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'At Risk',    items:[5,3,2,1,0,0,0,0,2],    totalKg:13,  totalAmount:390,  paymentStatus:'Yet to Receive', orderStatus:'Postponed' }),
  makeRow({ name:'Ritu Agarwal',     mobile:'9223344556', houseNo:'H-301', society:'South City 1 Tower 2',  sector:'South City 1', pickupDate:'2026-03-25', orderDate:'2026-03-23', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[11,9,6,2,1,0,1,0,0],   totalKg:30,  totalAmount:900,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Sanjeev Kumar',    mobile:'9334455667', houseNo:'J-12',  society:'Sushant Lok 2 Block A', sector:'Sushant Lok 2',pickupDate:'2026-01-10', orderDate:'2026-01-08', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'At Risk',    items:[4,3,0,1,0,2,0,0,1],    totalKg:11,  totalAmount:330,  paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Anita Joshi',      mobile:'9445566778', houseNo:'K-401', society:'Palam Vihar Block A',   sector:'Palam Vihar',  pickupDate:'2026-03-15', orderDate:'2026-03-13', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[17,12,3,5,2,0,1,0,2],  totalKg:42,  totalAmount:1260, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Harish Malhotra',  mobile:'9556677889', houseNo:'L-204', society:'DLF Phase 3 A Block',   sector:'DLF Phase 3',  pickupDate:'2026-02-05', orderDate:'2026-02-03', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Churned',    items:[0,0,0,0,0,0,0,0,0],    totalKg:0,   totalAmount:0,    paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Savita Rao',       mobile:'9667788990', houseNo:'M-103', society:'Orchid Petals',         sector:'Sector 40',    pickupDate:'2026-03-28', orderDate:'2026-03-26', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[10,7,5,3,0,1,2,0,1],   totalKg:29,  totalAmount:870,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Ajay Khanna',      mobile:'9778899001', houseNo:'N-7',   society:'Beverly Park 1',        sector:'DLF Phase 2',  pickupDate:'2026-02-20', orderDate:'2026-02-18', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Pickup Due', items:[8,6,4,2,1,0,0,0,3],    totalKg:24,  totalAmount:720,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Neha Srivastava',  mobile:'9889900112', houseNo:'P-501', society:'Unitech Harmony',       sector:'Sector 41',    pickupDate:'2026-04-05', orderDate:'2026-04-03', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[13,9,7,4,2,1,0,0,0],   totalKg:36,  totalAmount:1080, paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Rakesh Tiwari',    mobile:'9990011223', houseNo:'Q-22',  society:'Mayfield Garden Ph 1',  sector:'Sector 57',    pickupDate:'2026-01-25', orderDate:'2026-01-23', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'At Risk',    items:[6,4,3,1,0,0,1,0,2],    totalKg:17,  totalAmount:510,  paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Priya Nair',       mobile:'9001234567', houseNo:'R-301', society:'Vatika City',           sector:'Golf Course Rd',pickupDate:'2026-03-18', orderDate:'2026-03-16', kabName:'Pappu Ji',       kabPhone:'9543210098', donorStatus:'Active',     items:[16,11,6,4,1,2,1,0,2],  totalKg:43,  totalAmount:1290, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Suresh Pandey',    mobile:'9112345678', houseNo:'S-8',   society:'Heritage City',         sector:'Sector 23',    pickupDate:'2025-11-20', orderDate:'2025-11-18', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Churned',    items:[0,0,0,0,0,0,0,0,0],    totalKg:0,   totalAmount:0,    paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Meena Gupta',      mobile:'9223456789', houseNo:'T-104', society:'Bestech Park View',     sector:'Sector 58',    pickupDate:'2026-04-10', orderDate:'2026-04-08', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[9,6,4,2,0,1,1,0,1],    totalKg:24,  totalAmount:720,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Ashok Kumar',      mobile:'9334567890', houseNo:'U-205', society:'Emaar Palm Drive',      sector:'Sector 52',    pickupDate:'2026-03-08', orderDate:'2026-03-06', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[18,14,8,6,3,0,2,1,2],  totalKg:54,  totalAmount:1620, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Rekha Sharma',     mobile:'9445678901', houseNo:'V-3',   society:'Pinnacle Tower',        sector:'DLF Phase 3',  pickupDate:'2025-10-15', orderDate:'2025-10-13', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Churned',    items:[0,0,0,0,0,0,0,0,0],    totalKg:0,   totalAmount:0,    paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Vikram Bhatia',    mobile:'9012345999', houseNo:'W-601', society:'Nirvana Country 2',     sector:'Nirvana Country',pickupDate:'2026-04-02',orderDate:'2026-03-31', kabName:'Suresh Bhai',    kabPhone:'9765432100', donorStatus:'Active',     items:[7,5,3,1,0,2,0,0,1],    totalKg:19,  totalAmount:570,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Preeti Nair',      mobile:'9654321888', houseNo:'X-402', society:'Ardee City Block A',    sector:'Ardee City',   pickupDate:'2026-02-22', orderDate:'2026-02-20', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Pickup Due', items:[10,8,5,3,2,0,1,0,2],   totalKg:31,  totalAmount:930,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Amit Saxena',      mobile:'9765432111', houseNo:'Y-101', society:'DLF Phase 4 Magnolias', sector:'DLF Phase 4',  pickupDate:'2026-03-30', orderDate:'2026-03-28', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[22,16,9,7,4,3,2,0,3],  totalKg:66,  totalAmount:1980, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Sonia Kapoor',     mobile:'9876543999', houseNo:'Z-204', society:'South City 2 Tower 1',  sector:'South City 2', pickupDate:'2026-01-14', orderDate:'2026-01-12', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'At Risk',    items:[5,3,2,0,1,0,0,0,2],    totalKg:13,  totalAmount:390,  paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Rohit Bajaj',      mobile:'9123456999', houseNo:'AA-7',  society:'Sushant Lok 1 Block B', sector:'Sushant Lok 1',pickupDate:'2026-04-08', orderDate:'2026-04-06', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[11,8,6,4,2,1,1,0,2],   totalKg:35,  totalAmount:1050, paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Divya Mehta',      mobile:'9234567000', houseNo:'BB-301',society:'Palm Springs',           sector:'Sector 52',    pickupDate:'2026-03-12', orderDate:'2026-03-10', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Active',     items:[14,10,7,5,3,2,1,0,1],  totalKg:43,  totalAmount:1290, paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Karan Malhotra',   mobile:'9345678000', houseNo:'CC-8',  society:'Jal Vayu Vihar',        sector:'Sector 22',    pickupDate:'2026-02-10', orderDate:'2026-02-08', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Pickup Due', items:[8,6,3,2,1,0,1,0,2],    totalKg:23,  totalAmount:690,  paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Nisha Trivedi',    mobile:'9456789000', houseNo:'DD-204',society:'Greenwood City Ph 2',   sector:'Sector 45',    pickupDate:'2026-04-12', orderDate:'2026-04-10', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[13,9,5,3,2,1,0,0,1],   totalKg:34,  totalAmount:1020, paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Prakash Dubey',    mobile:'9567890000', houseNo:'EE-102',society:'Palam Vihar Block C',   sector:'Palam Vihar',  pickupDate:'2025-12-20', orderDate:'2025-12-18', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'Churned',    items:[0,0,0,0,0,0,0,0,0],    totalKg:0,   totalAmount:0,    paymentStatus:'Write-off',      orderStatus:'Cancelled' }),
  makeRow({ name:'Alka Srivastava',  mobile:'9678901111', houseNo:'FF-5',  society:'The Close North',       sector:'Sector 43',    pickupDate:'2026-03-22', orderDate:'2026-03-20', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[10,7,4,3,1,2,1,0,2],   totalKg:30,  totalAmount:900,  paymentStatus:'Received',       orderStatus:'Completed' }),
  makeRow({ name:'Gaurav Tripathi',  mobile:'9789012222', houseNo:'GG-601',society:'DLF Phase 5 Belvedere', sector:'DLF Phase 5',  pickupDate:'2026-04-14', orderDate:'2026-04-12', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[15,11,8,6,3,2,2,1,2],  totalKg:50,  totalAmount:1500, paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Seema Agarwal',    mobile:'9890123333', houseNo:'HH-3',  society:'Vipul Greens',          sector:'Sector 31',    pickupDate:'2026-02-18', orderDate:'2026-02-16', kabName:'Raju Kabadi',     kabPhone:'9654321009', donorStatus:'At Risk',    items:[4,3,2,1,0,0,0,0,1],    totalKg:11,  totalAmount:330,  paymentStatus:'Write-off',      orderStatus:'Postponed' }),
  makeRow({ name:'Naveen Sharma',    mobile:'9901234444', houseNo:'JJ-201',society:'Qutab Plaza',           sector:'Sector 22',    pickupDate:'2026-04-18', orderDate:'2026-04-16', kabName:'Suresh Bhai',     kabPhone:'9765432100', donorStatus:'Active',     items:[12,9,6,4,2,1,1,0,2],   totalKg:37,  totalAmount:1110, paymentStatus:'Yet to Receive', orderStatus:'Pending' }),
  makeRow({ name:'Tanya Kapoor',     mobile:'9012345555', houseNo:'KK-407',society:'Ireo Grand Arch',       sector:'Sector 41',    pickupDate:'2026-03-05', orderDate:'2026-03-03', kabName:'Pappu Ji',        kabPhone:'9543210098', donorStatus:'Active',     items:[16,12,7,5,3,2,2,0,3],  totalKg:50,  totalAmount:1500, paymentStatus:'Received',       orderStatus:'Completed' }),
]

// ── Derived filter options ────────────────────────────────────────────────────
export const UNIQUE_SECTORS  = [...new Set(raddiMasterData.map(r => r.sector))].sort()
export const UNIQUE_SOCIETIES = [...new Set(raddiMasterData.map(r => r.society))].sort()