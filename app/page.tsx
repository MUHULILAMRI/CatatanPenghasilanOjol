"use client";

import { useState, useEffect } from "react";

type Platform = "gojek" | "grab" | "maxim" | "indriver";
type TabType = "input" | "riwayat" | "ringkasan";

interface Transaksi {
  id: string;
  tanggal: string;
  platform: Platform;
  jenis: "pemasukan" | "pengeluaran";
  kategori: string;
  keterangan: string;
  jumlah: number;
  orderCount?: number;
}

const PLATFORM_CONFIG: Record<Platform, { nama: string; warna: string; potongan: number; emoji: string }> = {
  gojek: { nama: "Gojek", warna: "bg-green-500", potongan: 20, emoji: "🟢" },
  grab: { nama: "Grab", warna: "bg-green-600", potongan: 20, emoji: "🟩" },
  maxim: { nama: "Maxim", warna: "bg-yellow-500", potongan: 15, emoji: "🟡" },
  indriver: { nama: "inDriver", warna: "bg-blue-500", potongan: 0, emoji: "🔵" },
};

const KATEGORI_PENGELUARAN = ["Bensin", "Makan & Minum", "Perawatan Motor", "Parkir", "Pulsa/Internet", "Lainnya"];
const KATEGORI_PEMASUKAN = ["Order Penumpang", "Order Makanan", "Order Barang", "Bonus", "Tips", "Lainnya"];

function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function getTanggalHariIni(): string {
  return new Date().toISOString().split("T")[0];
}

function getBulanIni(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getNamaBulan(bulan: string): string {
  const [tahun, bln] = bulan.split("-");
  const namaBulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${namaBulan[parseInt(bln) - 1]} ${tahun}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("input");
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);

  // Form state
  const [tanggal, setTanggal] = useState(getTanggalHariIni());
  const [platform, setPlatform] = useState<Platform>("gojek");
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kategori, setKategori] = useState("Order Penumpang");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [orderCount, setOrderCount] = useState("");
  const [hitungPotongan, setHitungPotongan] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [filterBulan, setFilterBulan] = useState(getBulanIni());
  const [hapusId, setHapusId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ojol_transaksi");
    if (saved) setTransaksi(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("ojol_transaksi", JSON.stringify(transaksi));
  }, [transaksi]);

  useEffect(() => {
    setKategori(jenis === "pemasukan" ? "Order Penumpang" : "Bensin");
  }, [jenis]);

  const handleTambah = () => {
    const nominal = parseFloat(jumlah);
    if (!nominal || nominal <= 0) return;

    let nominalFinal = nominal;
    if (jenis === "pemasukan" && hitungPotongan) {
      const potongan = PLATFORM_CONFIG[platform].potongan;
      nominalFinal = nominal - (nominal * potongan / 100);
    }

    const baru: Transaksi = {
      id: Date.now().toString(),
      tanggal,
      platform,
      jenis,
      kategori,
      keterangan,
      jumlah: nominalFinal,
      orderCount: orderCount ? parseInt(orderCount) : undefined,
    };

    setTransaksi(prev => [baru, ...prev]);
    setJumlah("");
    setKeterangan("");
    setOrderCount("");
    setSuccessMsg("✅ Data berhasil disimpan!");
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const hapusTransaksi = (id: string) => {
    setTransaksi(prev => prev.filter(t => t.id !== id));
    setHapusId(null);
  };

  // Filter berdasarkan bulan
  const transaksiFiltered = transaksi.filter(t => t.tanggal.startsWith(filterBulan));

  // Hitung ringkasan
  const totalPemasukan = transaksiFiltered.filter(t => t.jenis === "pemasukan").reduce((a, t) => a + t.jumlah, 0);
  const totalPengeluaran = transaksiFiltered.filter(t => t.jenis === "pengeluaran").reduce((a, t) => a + t.jumlah, 0);
  const keuntunganBersih = totalPemasukan - totalPengeluaran;
  const totalOrder = transaksiFiltered.filter(t => t.jenis === "pemasukan").reduce((a, t) => a + (t.orderCount || 0), 0);

  // Ringkasan per platform
  const ringkasanPlatform = (Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => {
    const masuk = transaksiFiltered.filter(t => t.platform === p && t.jenis === "pemasukan").reduce((a, t) => a + t.jumlah, 0);
    const keluar = transaksiFiltered.filter(t => t.platform === p && t.jenis === "pengeluaran").reduce((a, t) => a + t.jumlah, 0);
    const order = transaksiFiltered.filter(t => t.platform === p && t.jenis === "pemasukan").reduce((a, t) => a + (t.orderCount || 0), 0);
    return { platform: p, masuk, keluar, order };
  }).filter(r => r.masuk > 0 || r.keluar > 0);

  // Ringkasan per hari
  const ringkasanHarian = transaksiFiltered.reduce((acc, t) => {
    if (!acc[t.tanggal]) acc[t.tanggal] = { pemasukan: 0, pengeluaran: 0 };
    if (t.jenis === "pemasukan") acc[t.tanggal].pemasukan += t.jumlah;
    else acc[t.tanggal].pengeluaran += t.jumlah;
    return acc;
  }, {} as Record<string, { pemasukan: number; pengeluaran: number }>);

  const hariAktif = Object.keys(ringkasanHarian).length;
  const rataHarian = hariAktif > 0 ? keuntunganBersih / hariAktif : 0;

  // Daftar bulan yang tersedia
  const bulanTersedia = [...new Set(transaksi.map(t => t.tanggal.substring(0, 7)))].sort().reverse();
  if (!bulanTersedia.includes(getBulanIni())) bulanTersedia.unshift(getBulanIni());

  const tabs = [
    { id: "input" as TabType, label: "Catat", icon: "✏️" },
    { id: "riwayat" as TabType, label: "Riwayat", icon: "📋" },
    { id: "ringkasan" as TabType, label: "Ringkasan", icon: "📊" },
  ];

  return (
    <main className="min-h-screen py-4 px-3">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🛵</span>
            <div>
              <h1 className="text-xl font-bold">Penghasilan Ojol</h1>
              <p className="text-green-200 text-sm">Catat pemasukan & pengeluaran harian</p>
            </div>
          </div>
          {/* Mini summary */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-xs text-green-100">Pemasukan</p>
              <p className="font-bold text-sm">{formatRupiah(totalPemasukan)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-xs text-green-100">Pengeluaran</p>
              <p className="font-bold text-sm">{formatRupiah(totalPengeluaran)}</p>
            </div>
            <div className={`rounded-xl p-2 text-center ${keuntunganBersih >= 0 ? "bg-white/30" : "bg-red-400/40"}`}>
              <p className="text-xs text-green-100">Bersih</p>
              <p className="font-bold text-sm">{formatRupiah(keuntunganBersih)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Tab */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id ? "bg-green-600 text-white shadow" : "text-gray-500 hover:text-green-600"
              }`}>
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== TAB INPUT ===== */}
        {activeTab === "input" && (
          <div className="bg-white rounded-2xl p-5 shadow mb-4">
            <h2 className="font-bold text-gray-700 border-b pb-2 mb-4">✏️ Catat Transaksi</h2>

            {/* Tanggal */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>

            {/* Jenis */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Jenis</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setJenis("pemasukan")}
                  className={`py-3 rounded-xl font-semibold text-sm transition ${
                    jenis === "pemasukan" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>💰 Pemasukan</button>
                <button onClick={() => setJenis("pengeluaran")}
                  className={`py-3 rounded-xl font-semibold text-sm transition ${
                    jenis === "pengeluaran" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>💸 Pengeluaran</button>
              </div>
            </div>

            {/* Platform */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`py-2 rounded-xl text-sm font-semibold transition border-2 ${
                      platform === p ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}>
                    {PLATFORM_CONFIG[p].emoji} {PLATFORM_CONFIG[p].nama}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Kategori</label>
              <select value={kategori} onChange={e => setKategori(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
                {(jenis === "pemasukan" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Jumlah */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {jenis === "pemasukan" ? "Pendapatan Kotor (Rp)" : "Jumlah Pengeluaran (Rp)"}
                <span className="text-red-500"> *</span>
              </label>
              <input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)}
                placeholder="Contoh: 50000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>

            {/* Potongan & Order (hanya pemasukan) */}
            {jenis === "pemasukan" && (
              <>
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Potongan Aplikasi</p>
                      <p className="text-xs text-yellow-600">{PLATFORM_CONFIG[platform].nama}: {PLATFORM_CONFIG[platform].potongan}%</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hitungPotongan} onChange={e => setHitungPotongan(e.target.checked)}
                        className="w-4 h-4 accent-green-600" />
                      <span className="text-xs text-yellow-700 font-medium">Potong otomatis</span>
                    </label>
                  </div>
                  {jumlah && hitungPotongan && PLATFORM_CONFIG[platform].potongan > 0 && (
                    <div className="mt-2 pt-2 border-t border-yellow-200">
                      <div className="flex justify-between text-xs">
                        <span className="text-yellow-700">Pendapatan kotor</span>
                        <span className="font-semibold">{formatRupiah(parseFloat(jumlah) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600">Potongan {PLATFORM_CONFIG[platform].potongan}%</span>
                        <span className="font-semibold text-red-600">- {formatRupiah((parseFloat(jumlah) || 0) * PLATFORM_CONFIG[platform].potongan / 100)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-700 font-bold">Pendapatan bersih</span>
                        <span className="font-bold text-green-700">{formatRupiah((parseFloat(jumlah) || 0) * (1 - PLATFORM_CONFIG[platform].potongan / 100))}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Order <span className="text-gray-400 text-xs">(opsional)</span></label>
                  <input type="number" value={orderCount} onChange={e => setOrderCount(e.target.value)}
                    placeholder="Contoh: 5"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
                </div>
              </>
            )}

            {/* Keterangan */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan <span className="text-gray-400 text-xs">(opsional)</span></label>
              <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)}
                placeholder="Contoh: Bensin pagi"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>

            {successMsg && (
              <div className="mb-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm text-center font-semibold">
                {successMsg}
              </div>
            )}

            <button onClick={handleTambah} disabled={!jumlah}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow disabled:opacity-50">
              Simpan Transaksi 💾
            </button>
          </div>
        )}

        {/* ===== TAB RIWAYAT ===== */}
        {activeTab === "riwayat" && (
          <div className="mb-4">
            {/* Filter bulan */}
            <div className="bg-white rounded-xl p-3 shadow mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Filter Bulan</label>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
                {bulanTersedia.map(b => (
                  <option key={b} value={b}>{getNamaBulan(b)}</option>
                ))}
              </select>
            </div>

            {transaksiFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow text-center">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-gray-400 text-sm">Belum ada transaksi di bulan ini</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transaksiFiltered.map(t => (
                  <div key={t.id} className="bg-white rounded-xl p-4 shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {PLATFORM_CONFIG[t.platform].emoji} {PLATFORM_CONFIG[t.platform].nama}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            t.jenis === "pemasukan" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>{t.kategori}</span>
                        </div>
                        <p className="text-xs text-gray-400">{t.tanggal} {t.keterangan && `· ${t.keterangan}`} {t.orderCount ? `· ${t.orderCount} order` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-sm ${
                          t.jenis === "pemasukan" ? "text-green-600" : "text-red-500"
                        }`}>
                          {t.jenis === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                        </p>
                        <button onClick={() => setHapusId(t.id)}
                          className="text-gray-300 hover:text-red-400 transition text-lg leading-none">
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Konfirmasi hapus */}
            {hapusId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                  <p className="font-bold text-gray-700 mb-2">Hapus transaksi ini?</p>
                  <p className="text-sm text-gray-400 mb-4">Data yang dihapus tidak bisa dikembalikan.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setHapusId(null)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold">Batal</button>
                    <button onClick={() => hapusTransaksi(hapusId)}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">Hapus</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB RINGKASAN ===== */}
        {activeTab === "ringkasan" && (
          <div className="mb-4 space-y-3">
            {/* Filter bulan */}
            <div className="bg-white rounded-xl p-3 shadow">
              <label className="block text-sm font-medium text-gray-600 mb-1">Pilih Bulan</label>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
                {bulanTersedia.map(b => (
                  <option key={b} value={b}>{getNamaBulan(b)}</option>
                ))}
              </select>
            </div>

            {/* Ringkasan Bulan */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-2xl p-5 text-white shadow">
              <p className="text-green-200 text-sm mb-3">📅 Ringkasan {getNamaBulan(filterBulan)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-xs text-green-100">Total Pemasukan</p>
                  <p className="font-bold">{formatRupiah(totalPemasukan)}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-xs text-green-100">Total Pengeluaran</p>
                  <p className="font-bold">{formatRupiah(totalPengeluaran)}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-xs text-green-100">Hari Aktif</p>
                  <p className="font-bold">{hariAktif} hari</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-xs text-green-100">Total Order</p>
                  <p className="font-bold">{totalOrder} order</p>
                </div>
              </div>
              <div className={`mt-3 rounded-xl p-3 ${keuntunganBersih >= 0 ? "bg-white/30" : "bg-red-400/40"}`}>
                <p className="text-xs text-green-100">💵 Penghasilan Bersih</p>
                <p className="font-bold text-xl">{formatRupiah(keuntunganBersih)}</p>
                <p className="text-xs text-green-200 mt-1">Rata-rata {formatRupiah(rataHarian)}/hari</p>
              </div>
            </div>

            {/* Per Platform */}
            {ringkasanPlatform.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">📱 Per Platform</h3>
                <div className="space-y-3">
                  {ringkasanPlatform.map(r => (
                    <div key={r.platform} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">
                          {PLATFORM_CONFIG[r.platform].emoji} {PLATFORM_CONFIG[r.platform].nama}
                        </span>
                        <span className="text-xs text-gray-400">{r.order > 0 ? `${r.order} order` : ""}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Pemasukan</p>
                          <p className="font-bold text-green-600">{formatRupiah(r.masuk)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Pengeluaran</p>
                          <p className="font-bold text-red-500">{formatRupiah(r.keluar)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Bersih</p>
                          <p className={`font-bold ${r.masuk - r.keluar >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatRupiah(r.masuk - r.keluar)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ringkasan Harian */}
            {Object.keys(ringkasanHarian).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">📆 Rincian Harian</h3>
                <div className="space-y-2">
                  {Object.entries(ringkasanHarian).sort((a, b) => b[0].localeCompare(a[0])).map(([tgl, data]) => (
                    <div key={tgl} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{tgl}</span>
                      <div className="text-right">
                        <p className="text-xs text-green-600">+{formatRupiah(data.pemasukan)}</p>
                        {data.pengeluaran > 0 && <p className="text-xs text-red-500">-{formatRupiah(data.pengeluaran)}</p>}
                        <p className="text-xs font-bold text-gray-700">{formatRupiah(data.pemasukan - data.pengeluaran)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transaksiFiltered.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow text-center">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-gray-400 text-sm">Belum ada data di bulan ini</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-6">🛵 Data tersimpan di perangkat · © 2024 Ojol Tracker</p>
      </div>
    </main>
  );
}
