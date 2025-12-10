const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ==================== KONFIGURASI ====================
const PORT_NAME = "COM1";
const TOP_MARGIN_LINES = 3; // Jumlah baris kosong di awal sebelum print
const AUTO_FEED_LINES = 4; // Jumlah baris feed otomatis setelah print
const LINE_WIDTH = 32; // Lebar baris untuk printer (32 untuk 58mm, 48 untuk 80mm)
// =====================================================

// Fungsi helper untuk memproses tag <td> menjadi kolom
function processTdTags(line) {
  // Cari semua <td>...</td> dalam baris
  const tdRegex = /<td>(.*?)<\/td>/gi;
  const matches = [];
  let match;

  while ((match = tdRegex.exec(line)) !== null) {
    matches.push(match[1]); // Ambil content di dalam <td>
  }

  if (matches.length === 0) {
    return line; // Tidak ada <td>, kembalikan line asli
  }

  // Hapus semua tag <td> dari line
  line = line.replace(tdRegex, "");

  if (matches.length === 1) {
    // Hanya 1 kolom, otomatis rata tengah
    // Hapus alignment tags dari dalam td (sudah tidak diperlukan)
    let content = matches[0]
      .replace(/<\/?center>/gi, "")
      .replace(/<\/?right>/gi, "")
      .replace(/<\/?left>/gi, "");

    // Tambahkan center align command
    const ESC = "\x1B";
    const centerAlign = ESC + "\x61\x01";

    return centerAlign + content + line;
  } else if (matches.length >= 2) {
    // 2+ kolom: kolom pertama di kiri, kolom kedua di kanan, sisanya diabaikan
    // Hapus alignment tags dari dalam td karena posisi sudah diatur oleh spacing
    let col1 = matches[0]
      .replace(/<\/?center>/gi, "")
      .replace(/<\/?right>/gi, "")
      .replace(/<\/?left>/gi, "");
    let col2 = matches[1]
      .replace(/<\/?center>/gi, "")
      .replace(/<\/?right>/gi, "")
      .replace(/<\/?left>/gi, "");

    // Hitung panjang text TANPA semua tag HTML untuk spacing yang akurat
    const actualCol1Length = col1.replace(/<[^>]*>/g, "").length;
    const actualCol2Length = col2.replace(/<[^>]*>/g, "").length;
    const totalContentLength = actualCol1Length + actualCol2Length;
    const spacing = Math.max(1, LINE_WIDTH - totalContentLength);

    return col1 + " ".repeat(spacing) + col2 + line;
  }

  return line;
}

// Fungsi untuk mencetak menggunakan CMD type (terbukti berhasil!)
function print(text) {
  return new Promise((resolve, reject) => {
    try {
      // Konversi tag HTML menjadi ESC/POS commands
      // ESC E 1 = Turn on bold (\x1B\x45\x01)
      // ESC E 0 = Turn off bold (\x1B\x45\x00)
      // GS ! 0x11 = Set character size 2x2 (width x height) (\x1D\x21\x11)
      // GS ! 0x00 = Reset character size to normal (\x1D\x21\x00)
      // ESC a 0 = Left align (\x1B\x61\x00)
      // ESC a 1 = Center align (\x1B\x61\x01)
      // ESC a 2 = Right align (\x1B\x61\x02)
      const ESC = "\x1B";
      const GS = "\x1D";
      const boldOn = ESC + "\x45\x01";
      const boldOff = ESC + "\x45\x00";
      const h1On = GS + "\x21\x11"; // 2x2 size (width & height)
      const h1Off = GS + "\x21\x00"; // Reset to normal
      const centerAlign = ESC + "\x61\x01"; // Center align
      const rightAlign = ESC + "\x61\x02"; // Right align
      const leftAlign = ESC + "\x61\x00"; // Left align (reset)

      // STEP 1: Konversi <tr> ke newline dulu (tapi JANGAN <br> dulu!)
      let processedText = text
        .replace(/<tr>/gi, "\n") // Opening <tr> = newline (mulai baris)
        .replace(/<\/tr>/gi, ""); // Closing </tr> = hapus (agar tidak double newline)

      // STEP 2: Proses tag <td> per baris untuk membuat kolom
      // (saat ini <td>...</td> masih utuh meski ada <br> di dalamnya)
      let lines = processedText.split("\n");
      lines = lines.map((line) => processTdTags(line));
      processedText = lines.join("\n");

      // STEP 3: Sekarang baru konversi <br> ke newline
      processedText = processedText.replace(/<br\s*\/?>/gi, "\n"); // Ganti <br> atau <br/> dengan newline

      // STEP 4: Proses tag formatting lainnya
      // Tag alignment tidak wajib ditutup - closing tag akan dihapus jika ada
      processedText = processedText
        .replace(/<\/center>/gi, "") // Hapus closing tag (diabaikan)
        .replace(/<\/right>/gi, "") // Hapus closing tag (diabaikan)
        .replace(/<\/left>/gi, "") // Hapus closing tag (diabaikan)
        .replace(/<center>/gi, centerAlign) // Ganti <center> dengan center align
        .replace(/<right>/gi, rightAlign) // Ganti <right> dengan right align
        .replace(/<left>/gi, leftAlign) // Ganti <left> dengan left align
        .replace(/<b>/gi, boldOn) // Ganti <b> dengan bold on
        .replace(/<\/b>/gi, boldOff) // Ganti </b> dengan bold off
        .replace(/<h1>/gi, h1On) // Ganti <h1> dengan double size on
        .replace(/<\/h1>/gi, h1Off); // Ganti </h1> dengan size reset

      // Tambahkan baris kosong di awal sesuai konfigurasi
      const topMargin = "\r\n".repeat(TOP_MARGIN_LINES);

      // Buat temp file
      const tempFile = path.join(__dirname, "temp_print.txt");

      // Tulis text ke temp file dengan margin atas, CRLF + auto feed di akhir
      processedText = processedText.replace(/\n/g, "\r\n");
      const feedLines = "\r\n".repeat(AUTO_FEED_LINES);
      fs.writeFileSync(tempFile, topMargin + processedText + feedLines, {
        encoding: "binary",
      });

      // Copy file ke COM port menggunakan CMD
      const command = `type "${tempFile}" > ${PORT_NAME}`;

      console.log(`📄 Mencetak ${text.split("\n").length} baris...`);
      console.log(`   Menjalankan: ${command}`);

      exec(command, (error, stdout, stderr) => {
        // Hapus temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore error saat delete temp file
        }

        if (error) {
          console.error("Error:", error.message);
          reject(error);
          return;
        }

        console.log(
          `✓ Data terkirim ke ${PORT_NAME} (+ ${AUTO_FEED_LINES} line feed)`
        );
        resolve();
      });
    } catch (error) {
      console.error("Error:", error.message);
      reject(error);
    }
  });
}

// Fungsi untuk generate dan print QR Code menggunakan ESC/POS commands
async function printQRCode(data) {
  return new Promise((resolve, reject) => {
    try {
      console.log(
        `📱 Generating QR Code untuk: ${data.substring(0, 50)}${
          data.length > 50 ? "..." : ""
        }`
      );

      // ESC/POS QR Code Commands untuk printer thermal
      const ESC = "\x1B";
      const GS = "\x1D";

      // QR Code Model (Model 2 adalah yang paling umum)
      const qrModel = GS + "(k" + String.fromCharCode(4, 0, 49, 65, 50, 0);

      // QR Code Size (1-16, 8 adalah ukuran medium)
      const qrSize = GS + "(k" + String.fromCharCode(3, 0, 49, 67, 8);

      // QR Code Error Correction Level (M = Medium 48)
      const qrErrorLevel = GS + "(k" + String.fromCharCode(3, 0, 49, 69, 48);

      // Store QR Code data
      const dataLength = data.length + 3;
      const pL = dataLength % 256;
      const pH = Math.floor(dataLength / 256);
      const qrStore =
        GS + "(k" + String.fromCharCode(pL, pH, 49, 80, 48) + data;

      // Print QR Code
      const qrPrint = GS + "(k" + String.fromCharCode(3, 0, 49, 81, 48);

      // Gabungkan semua commands
      const qrCommands =
        ESC +
        "@" + // Initialize printer
        ESC +
        "a" +
        "\x01" + // Center align
        qrModel +
        qrSize +
        qrErrorLevel +
        qrStore +
        qrPrint +
        "\n\n\n" + // Feed 3 lines
        ESC +
        "a" +
        "\x00"; // Left align (reset)

      // Buat temp file dengan binary data
      const tempFile = path.join(__dirname, "temp_qr.bin");
      fs.writeFileSync(tempFile, qrCommands, { encoding: "binary" });

      // Copy file ke COM port
      const command = `type "${tempFile}" > ${PORT_NAME}`;

      console.log(`   Menjalankan ESC/POS QR Code command...`);

      exec(command, (error, stdout, stderr) => {
        // Hapus temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore error
        }

        if (error) {
          console.error("Error:", error.message);
          reject(error);
          return;
        }

        console.log(`✓ QR Code terkirim ke ${PORT_NAME}`);
        resolve({ success: true });
      });
    } catch (error) {
      console.error("Error generating QR code:", error.message);
      reject(error);
    }
  });
}

// Fungsi untuk print QR Code dengan text di bawahnya
async function printQRWithText(qrData, text = "") {
  return new Promise((resolve, reject) => {
    try {
      console.log(`📱 Generating QR Code dengan text...`);

      // ESC/POS QR Code Commands
      const ESC = "\x1B";
      const GS = "\x1D";

      // QR Code Model (Model 2)
      const qrModel = GS + "(k" + String.fromCharCode(4, 0, 49, 65, 50, 0);

      // QR Code Size (1-16, 8 = medium)
      const qrSize = GS + "(k" + String.fromCharCode(3, 0, 49, 67, 8);

      // QR Code Error Correction Level (M = Medium)
      const qrErrorLevel = GS + "(k" + String.fromCharCode(3, 0, 49, 69, 48);

      // Store QR Code data
      const dataLength = qrData.length + 3;
      const pL = dataLength % 256;
      const pH = Math.floor(dataLength / 256);
      const qrStore =
        GS + "(k" + String.fromCharCode(pL, pH, 49, 80, 48) + qrData;

      // Print QR Code
      const qrPrint = GS + "(k" + String.fromCharCode(3, 0, 49, 81, 48);

      // Build commands
      let commands =
        ESC +
        "@" + // Initialize
        ESC +
        "a" +
        "\x01" + // Center align
        qrModel +
        qrSize +
        qrErrorLevel +
        qrStore +
        qrPrint +
        "\n"; // Feed after QR

      // Tambahkan text jika ada
      if (text && text.trim() !== "") {
        const processedText = text.replace(/\n/g, "\r\n");
        commands += processedText + "\r\n";
      }

      // Feed lines dan reset alignment
      const feedLines = "\r\n".repeat(AUTO_FEED_LINES);
      commands += feedLines + ESC + "a" + "\x00"; // Reset to left align

      // Buat temp file
      const tempFile = path.join(__dirname, "temp_qr.bin");
      fs.writeFileSync(tempFile, commands, { encoding: "binary" });

      // Copy ke COM port
      const command = `type "${tempFile}" > ${PORT_NAME}`;

      console.log(`   QR: ${qrData.substring(0, 30)}...`);
      if (text) console.log(`   Text: ${text.substring(0, 50)}...`);

      exec(command, (error, stdout, stderr) => {
        // Hapus temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore
        }

        if (error) {
          console.error("Error:", error.message);
          reject(error);
          return;
        }

        console.log(`✓ QR Code + Text terkirim ke ${PORT_NAME}`);
        resolve({ success: true });
      });
    } catch (error) {
      console.error("Error:", error.message);
      reject(error);
    }
  });
}

// Export fungsi untuk digunakan sebagai module
module.exports = { print, printQRCode, printQRWithText, PORT_NAME };

// Main program (hanya jalan jika dijalankan langsung, bukan di-import)
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2);
    const text = args.join(" ") || "TEST";

    await print(text);
  }

  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
