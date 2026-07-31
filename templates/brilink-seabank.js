/**
 * Template struk BRILink — Bukti Transfer (data dari resi SeaBank)
 * Lebar: 32 karakter (printer 58mm)
 *
 * Cetak:
 *   node templates/brilink-seabank.js
 *   node templates/brilink-seabank.js templates/data/brilink-seabank.sample.json
 */

const LINE_WIDTH = 32;
const SEP = "-".repeat(LINE_WIDTH);

function row(label, value) {
  const l = String(label).padEnd(11);
  return `${l}: ${value}`;
}

function wrapName(prefix, name, width = LINE_WIDTH) {
  const words = String(name || "")
    .trim()
    .split(/\s+/);
  const lines = [];
  let current = prefix;
  const pad = " ".repeat(prefix.length);

  const appendForced = (word) => {
    let rest = word;
    while (rest.length > 0) {
      const head = current === prefix ? prefix : pad;
      const avail = width - head.length;
      if (rest.length <= avail) {
        current = head + rest;
        rest = "";
      } else {
        lines.push(head + rest.slice(0, avail));
        rest = rest.slice(avail);
        current = pad;
      }
    }
  };

  for (const word of words) {
    const candidate = current === prefix ? current + word : `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current !== prefix) lines.push(current);
      current = current === prefix ? prefix : pad;
      appendForced(word);
    }
  }
  if (current.trim()) lines.push(current);
  return lines.join("\n");
}

/**
 * @param {object} d
 */
function build(d = {}) {
  const jenis = d.jenis || "TRANSFER ANTAR BANK";
  const bankPengirim = d.pengirim_bank || "SeaBank";
  const bankPenerima = d.penerima_bank || "SeaBank";
  const admin = d.admin || "GRATIS";
  const berita = d.berita || "-";
  const total = d.total || d.nominal || "";
  const metode = d.metode || "Realtime Online";

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
    wrapName("NO.REF     : ", d.no_ref || ""),
    row("METODE", metode),
    SEP,
    jenis,
    SEP,
    "PENGIRIM",
    row("BANK", bankPengirim),
    row("NO.REK", d.pengirim_norek || ""),
    wrapName("NAMA       : ", d.pengirim_nama || ""),
    SEP,
    "PENERIMA",
    row("BANK", bankPenerima),
    row("NO.REK", d.penerima_norek || ""),
    wrapName("NAMA       : ", d.penerima_nama || ""),
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
    SEP,
    "Resi ini merupakan bukti",
    "transaksi yang sah.",
  ].join("\n");
}

/** Data dari resi SeaBank 30 Jul 2026, 07:23 */
const sample = {
  tanggal: "30-07-2026",
  jam: "07:23:00",
  no_ref: "2026073043507682078602160",
  metode: "Realtime Online",
  jenis: "TRANSFER ANTAR BANK",
  pengirim_bank: "SeaBank",
  pengirim_norek: "*******7052",
  pengirim_nama: "LUHUR GUNAWAN",
  penerima_bank: "SeaBank",
  penerima_norek: "*******1324",
  penerima_nama: "NERDISMAWATI SIMAMORA",
  nominal: "Rp500.000",
  admin: "GRATIS",
  total: "Rp500.000",
  berita: "Cb",
};

module.exports = { build, sample, LINE_WIDTH, SEP };

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
