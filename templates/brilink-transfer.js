/**
 * Template struk BRILink — Transfer Sesama BRI
 * Lebar: 32 karakter (printer 58mm)
 *
 * Cetak contoh:
 *   node templates/brilink-transfer.js
 *
 * Cetak dengan data custom (JSON file):
 *   node templates/brilink-transfer.js templates/data/brilink-transfer.sample.json
 */

const LINE_WIDTH = 32;
const SEP = "-".repeat(LINE_WIDTH);

function row(label, value) {
  const l = String(label).padEnd(11);
  return `${l}: ${value}`;
}

/** Wrap nama panjang tanpa potong di tengah kata bila memungkinkan */
function wrapName(prefix, name, width = LINE_WIDTH) {
  const words = String(name || "").trim().split(/\s+/);
  const lines = [];
  let current = prefix;

  for (const word of words) {
    const candidate = current === prefix ? current + word : `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current !== prefix) lines.push(current);
      // kata lebih panjang dari sisa baris → potong paksa
      let rest = word;
      const pad = " ".repeat(prefix.length);
      while (rest.length > 0) {
        const avail = width - pad.length;
        if (rest.length <= avail) {
          current = pad + rest;
          rest = "";
        } else {
          lines.push(pad + rest.slice(0, avail));
          rest = rest.slice(avail);
          current = pad;
        }
      }
    }
  }
  if (current.trim()) lines.push(current);
  return lines.join("\n");
}

/**
 * @param {object} d
 * @param {string} [d.tanggal]
 * @param {string} [d.jam]
 * @param {string} [d.no_ref]
 * @param {string} [d.jenis]          default: TRANSFER SESAMA BRI
 * @param {string} [d.pengirim_norek]
 * @param {string} [d.pengirim_nama]
 * @param {string} [d.penerima_norek]
 * @param {string} [d.penerima_nama]
 * @param {string} [d.penerima_bank]   default: BRI
 * @param {string} [d.nominal]        contoh: Rp40.000.000
 * @param {string} [d.admin]          default: Rp0
 * @param {string} [d.total]
 * @param {string} [d.berita]         default: -
 */
function build(d = {}) {
  const jenis = d.jenis || "TRANSFER SESAMA BRI";
  const bank = d.penerima_bank || "BRI";
  const admin = d.admin || "Rp0";
  const berita = d.berita || "-";
  const total = d.total || d.nominal || "";

  return [
    "<center><b>BANK BRI</b>",
    "PT. BANK RAKYAT INDONESIA",
    "(PERSERO) Tbk.",
    SEP,
    "<b>BUKTI TRANSFER</b>",
    "BRILink",
    SEP,
    `<left>${row("TANGGAL", d.tanggal || "")}`,
    row("JAM", d.jam || ""),
    row("NO.REF", d.no_ref || ""),
    SEP,
    jenis,
    SEP,
    "PENGIRIM",
    row("NO.REK", d.pengirim_norek || ""),
    wrapName("NAMA       : ", d.pengirim_nama || ""),
    SEP,
    "PENERIMA",
    row("NO.REK", d.penerima_norek || ""),
    wrapName("NAMA       : ", d.penerima_nama || ""),
    row("BANK", bank),
    SEP,
    row("NOMINAL", d.nominal || ""),
    row("ADMIN", admin),
    `<tr><td><b>TOTAL</b></td><td><b>${total}</b></td></tr>`,
    row("BERITA", berita),
    SEP,
    "<center>TRANSAKSI BERHASIL",
    "Terima kasih telah",
    "menggunakan BRILink",
    "www.bri.co.id",
  ].join("\n");
}

/** Data contoh — transaksi 30-07-2026 */
const sample = {
  tanggal: "30-07-2026",
  jam: "15:16:00",
  no_ref: "000308641360",
  jenis: "TRANSFER SESAMA BRI",
  pengirim_norek: "067201000299301",
  pengirim_nama: "FLIPTECH LENTERA INSPIRASI PETIWI",
  penerima_norek: "109801000681565",
  penerima_nama: "ANEKA PANGAN",
  penerima_bank: "BRI",
  nominal: "Rp40.000.000",
  admin: "Rp0",
  total: "Rp40.000.000",
  berita: "-",
};

module.exports = { build, sample, LINE_WIDTH, SEP };

// CLI: cetak ke printer server
if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  const http = require("http");

  const dataPath = process.argv[2];
  let data = sample;
  if (dataPath) {
    data = JSON.parse(fs.readFileSync(path.resolve(dataPath), "utf8"));
  }

  const text = build(data);
  const payload = JSON.stringify({ text, feed_lines: 5 });

  const req = http.request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/print",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        console.log(body);
        try {
          const j = JSON.parse(body);
          if (!j.success) process.exit(1);
        } catch (_) {
          process.exit(1);
        }
      });
    }
  );
  req.on("error", (e) => {
    console.error("Gagal kirim ke printer server:", e.message);
    console.error("Pastikan server aktif di http://localhost:3000");
    process.exit(1);
  });
  req.write(payload);
  req.end();
}
