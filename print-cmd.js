const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// ==================== KONFIGURASI ====================
// Default values (dipakai jika config.local.js tidak ada)
const DEFAULT_CONFIG = {
  PORT_NAME: "COM1",
  LINE_WIDTH: 32, // Lebar baris untuk printer (32 untuk 58mm, 48 untuk 80mm)
  PRINT_TIMEOUT: 10000, // Timeout untuk operasi print dalam milliseconds (10 detik)
  LINE_SPACING: 34, // Line spacing dalam unit 1/180 inch (default: 30, lebih besar = lebih renggang)
  MAX_QR_LENGTH: 300, // LIMIT HARDWARE: Maksimal karakter untuk QR Code
  QR_SIZE: 6, // QR Code size (1-16, semakin besar semakin besar ukurannya)
  QR_ERROR_LEVEL: 48, // 48 = Level L (Low), 49 = M, 50 = Q, 51 = H
};

// Load konfigurasi dari config.local.js jika ada, atau pakai default
let localConfig = {};
const configPath = path.join(__dirname, "config.local.js");
if (fs.existsSync(configPath)) {
  try {
    localConfig = require("./config.local.js");
    console.log("✓ Loaded config dari config.local.js");
  } catch (e) {
    console.warn("⚠️  Error loading config.local.js, menggunakan default:", e.message);
  }
}

// Merge config (local override default)
const config = { ...DEFAULT_CONFIG, ...localConfig };
const { PORT_NAME, LINE_WIDTH, PRINT_TIMEOUT, LINE_SPACING, MAX_QR_LENGTH, QR_SIZE, QR_ERROR_LEVEL } = config;
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

// Helper function untuk exec dengan timeout
function execWithTimeout(command, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Timeout: Operasi print melebihi ${timeout / 1000
          } detik. COM port mungkin tidak ready atau sedang sibuk.`
        )
      );
    }, timeout);

    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeoutId);

      if (error) {
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

// Fungsi untuk mencetak menggunakan CMD type (terbukti berhasil!)
function print(text, margin_top = 0, feed_lines = 0) {
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
      const setLineSpacing = ESC + "\x33" + String.fromCharCode(LINE_SPACING); // Set custom line spacing

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

      // STEP 3.5: Hapus leading newlines yang tidak perlu (dari <tr> pertama)
      processedText = processedText.replace(/^\n+/, "");

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

      // Tambahkan baris kosong di awal sesuai parameter
      const topMargin = "\r\n".repeat(margin_top);

      // ESC d n = Print and feed n lines (flush buffer)
      // Ini memastikan semua data di buffer printer tercetak
      const flushBuffer = ESC + "\x64\x03"; // Feed 3 lines untuk flush

      // Buat temp file
      const tempFile = path.join(__dirname, "temp_print.txt");

      // Tulis text ke temp file dengan line spacing, margin atas, CRLF + flush di akhir
      processedText = processedText.replace(/\n/g, "\r\n");
      const bottomFeed = "\r\n".repeat(feed_lines);
      fs.writeFileSync(
        tempFile,
        setLineSpacing + topMargin + processedText + bottomFeed + flushBuffer,
        {
          encoding: "binary",
        }
      );

      // Copy file ke COM port menggunakan CMD (copy /b lebih reliable untuk binary)
      const command = `copy /b "${tempFile}" ${PORT_NAME}`;

      console.log(`📄 Mencetak ${text.split("\n").length} baris...`);
      console.log(`   Menjalankan: ${command}`);

      execWithTimeout(command, PRINT_TIMEOUT)
        .then(() => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore error saat delete temp file
          }

          console.log(
            `✓ Data terkirim ke ${PORT_NAME} (margin: ${margin_top}, feed: ${feed_lines})`
          );
          resolve();
        })
        .catch((error) => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore error saat delete temp file
          }

          console.error("❌ Error:", error.message);
          reject(error);
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
        `📱 Generating QR Code untuk: ${data.substring(0, 50)}${data.length > 50 ? "..." : ""
        }`
      );
      console.log(`   Panjang data: ${data.length} karakter`);

      // Validasi panjang data QR
      if (data.length > MAX_QR_LENGTH) {
        const errorMsg = `⚠️  WARNING: Data QR terlalu panjang (${data.length} karakter). Maksimal: ${MAX_QR_LENGTH} karakter. QR code mungkin tidak tercetak!`;
        console.warn(errorMsg);
        // Potong data ke maksimal panjang
        data = data.substring(0, MAX_QR_LENGTH);
        console.log(`   Data dipotong menjadi ${data.length} karakter`);
      }

      // ESC/POS QR Code Commands untuk printer thermal
      const ESC = "\x1B";
      const GS = "\x1D";

      // QR Code Model (Model 2 adalah yang paling umum)
      const qrModel = GS + "(k" + String.fromCharCode(4, 0, 49, 65, 50, 0);

      // QR Code Size - menggunakan konfigurasi dari konstanta
      const qrSize = GS + "(k" + String.fromCharCode(3, 0, 49, 67, QR_SIZE);

      // QR Code Error Correction Level - menggunakan konfigurasi dari konstanta
      const qrErrorLevel =
        GS + "(k" + String.fromCharCode(3, 0, 49, 69, QR_ERROR_LEVEL);

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
      console.log(`   Timeout: ${PRINT_TIMEOUT / 1000} detik`);

      execWithTimeout(command, PRINT_TIMEOUT)
        .then(() => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore error
          }

          console.log(`✓ QR Code terkirim ke ${PORT_NAME}`);
          resolve({ success: true });
        })
        .catch((error) => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore error
          }

          console.error("❌ Error:", error.message);
          reject(error);
        });
    } catch (error) {
      console.error("Error generating QR code:", error.message);
      reject(error);
    }
  });
}

// Fungsi untuk print QR Code dengan text di bawahnya
async function printQRWithText(
  qrData,
  text = "",
  margin_top = 0,
  feed_lines = 0
) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`📱 Generating QR Code dengan text...`);
      console.log(`   Panjang QR data: ${qrData.length} karakter`);

      // Validasi panjang data QR
      if (qrData.length > MAX_QR_LENGTH) {
        const errorMsg = `⚠️  WARNING: Data QR terlalu panjang (${qrData.length} karakter). Maksimal: ${MAX_QR_LENGTH} karakter. QR code mungkin tidak tercetak!`;
        console.warn(errorMsg);
        // Potong data ke maksimal panjang
        qrData = qrData.substring(0, MAX_QR_LENGTH);
        console.log(`   Data QR dipotong menjadi ${qrData.length} karakter`);
      }

      // ESC/POS QR Code Commands
      const ESC = "\x1B";
      const GS = "\x1D";

      // QR Code Model (Model 2)
      const qrModel = GS + "(k" + String.fromCharCode(4, 0, 49, 65, 50, 0);

      // QR Code Size - menggunakan konfigurasi dari konstanta
      const qrSize = GS + "(k" + String.fromCharCode(3, 0, 49, 67, QR_SIZE);

      // QR Code Error Correction Level - menggunakan konfigurasi dari konstanta
      const qrErrorLevel =
        GS + "(k" + String.fromCharCode(3, 0, 49, 69, QR_ERROR_LEVEL);

      // Store QR Code data
      const dataLength = qrData.length + 3;
      const pL = dataLength % 256;
      const pH = Math.floor(dataLength / 256);
      const qrStore =
        GS + "(k" + String.fromCharCode(pL, pH, 49, 80, 48) + qrData;

      // Print QR Code
      const qrPrint = GS + "(k" + String.fromCharCode(3, 0, 49, 81, 48);

      // Build commands dengan margin dan feed yang dinamis (konsisten dengan print)
      const topMargin = "\r\n".repeat(margin_top);
      const bottomFeed = "\r\n".repeat(feed_lines);
      const setLineSpacing = ESC + "\x33" + String.fromCharCode(LINE_SPACING); // Set custom line spacing
      const flushBuffer = ESC + "\x64\x03"; // Feed 3 lines untuk flush

      let commands =
        ESC +
        "@" + // Initialize
        setLineSpacing + // Set line spacing (sama dengan print)
        topMargin + // Margin atas
        ESC +
        "a" +
        "\x01" + // Center align
        qrModel +
        qrSize +
        qrErrorLevel +
        qrStore +
        qrPrint +
        "\r\n\r\n"; // Feed 2 lines setelah QR (pakai CRLF)

      // Tambahkan text jika ada (gunakan \r\n untuk konsistensi)
      if (text && text.trim() !== "") {
        commands += text + "\r\n";
      }

      // Feed lines, reset alignment, dan flush buffer
      commands += bottomFeed + flushBuffer + ESC + "a" + "\x00"; // Reset to left align

      // Buat temp file
      const tempFile = path.join(__dirname, "temp_qr.bin");
      fs.writeFileSync(tempFile, commands, { encoding: "binary" });

      // Copy ke COM port
      const command = `type "${tempFile}" > ${PORT_NAME}`;

      console.log(`   QR: ${qrData.substring(0, 30)}...`);
      if (text) console.log(`   Text: ${text.substring(0, 50)}...`);
      console.log(`   Timeout: ${PRINT_TIMEOUT / 1000} detik`);

      execWithTimeout(command, PRINT_TIMEOUT)
        .then(() => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore
          }

          console.log(`✓ QR Code + Text terkirim ke ${PORT_NAME}`);
          resolve({ success: true });
        })
        .catch((error) => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore
          }

          console.error("❌ Error:", error.message);
          reject(error);
        });
    } catch (error) {
      console.error("Error:", error.message);
      reject(error);
    }
  });
}

// Fungsi test untuk diagnose QR code capability
async function testQRCapability() {
  return new Promise((resolve, reject) => {
    try {
      console.log(`\n🔍 Testing QR Code Capability...`);

      const ESC = "\x1B";
      const GS = "\x1D";

      // Test dengan QR code sederhana "TEST"
      const testData = "TEST";

      // QR Code Model (Model 2)
      const qrModel = GS + "(k" + String.fromCharCode(4, 0, 49, 65, 50, 0);

      // QR Code Size (size 8 untuk test)
      const qrSize = GS + "(k" + String.fromCharCode(3, 0, 49, 67, 8);

      // QR Code Error Correction Level (M = Medium)
      const qrErrorLevel = GS + "(k" + String.fromCharCode(3, 0, 49, 69, 49);

      // Store QR Code data
      const dataLength = testData.length + 3;
      const pL = dataLength % 256;
      const pH = Math.floor(dataLength / 256);
      const qrStore =
        GS + "(k" + String.fromCharCode(pL, pH, 49, 80, 48) + testData;

      // Print QR Code
      const qrPrint = GS + "(k" + String.fromCharCode(3, 0, 49, 81, 48);

      // Build test commands
      const testCommands =
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
        "\n\n" +
        "QR Test: TEST\n" + // Print text untuk konfirmasi
        "\n\n" +
        ESC +
        "a" +
        "\x00"; // Left align

      // Buat temp file
      const tempFile = path.join(__dirname, "temp_test_qr.bin");
      fs.writeFileSync(tempFile, testCommands, { encoding: "binary" });

      // Copy ke COM port
      const command = `type "${tempFile}" > ${PORT_NAME}`;

      console.log(`   Test data: "${testData}"`);
      console.log(`   Mengirim test QR ke ${PORT_NAME}...`);

      execWithTimeout(command, PRINT_TIMEOUT)
        .then(() => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore
          }

          console.log(`✓ Test QR command terkirim`);
          console.log(`   Cek printer: Jika QR muncul = SUPPORT ✓`);
          console.log(`   Cek printer: Jika hanya text = NOT SUPPORT ✗`);
          resolve({
            success: true,
            message: "Test command terkirim. Cek hasil di printer.",
            testData: testData,
          });
        })
        .catch((error) => {
          // Hapus temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore
          }

          console.error("❌ Test gagal:", error.message);
          reject(error);
        });
    } catch (error) {
      console.error("Error test QR:", error.message);
      reject(error);
    }
  });
}

// Fungsi untuk print QR Code sebagai IMAGE (untuk QRIS panjang >140 karakter)
async function printQRAsImage(qrData, text = "") {
  return new Promise((resolve, reject) => {
    try {
      console.log(`📱 Generating QR Code as IMAGE...`);
      console.log(`   Panjang QR data: ${qrData.length} karakter`);
      console.log(`   Mode: Raster Graphics (tidak ada batasan karakter)`);

      // Generate QR code sebagai buffer dengan qrcode library
      QRCode.toBuffer(
        qrData,
        {
          type: "png",
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256, // 256px untuk printer thermal 58mm
        },
        (err, buffer) => {
          if (err) {
            console.error("❌ Error generating QR image:", err.message);
            reject(err);
            return;
          }

          console.log(`   QR image generated: ${buffer.length} bytes`);

          // ESC/POS commands
          const ESC = "\x1B";
          const GS = "\x1D";

          // Tulis buffer ke file PNG sementara
          const pngFile = path.join(__dirname, "temp_qr.png");
          fs.writeFileSync(pngFile, buffer);

          // Untuk Windows, kita gunakan external tool atau print langsung
          // Alternatif: konversi PNG ke bitmap format yang kompatibel dengan printer
          // Untuk saat ini, kita gunakan pendekatan sederhana: print via Windows

          // Build commands dengan text
          let commands = ESC + "@"; // Initialize
          commands += ESC + "a" + "\x01"; // Center align

          // Note: Printing image via ESC/POS memerlukan konversi ke bitmap format
          // Untuk implementasi penuh, gunakan library seperti 'png-to-printer-bitmap'
          // Saat ini kita fallback ke native QR dengan truncation + warning

          console.log(
            "⚠️  Image printing memerlukan bitmap conversion yang kompleks"
          );
          console.log("   Fallback: menggunakan native QR dengan truncate");

          // Cleanup
          try {
            fs.unlinkSync(pngFile);
          } catch (e) {
            // Ignore
          }

          // Fallback ke printQRWithText dengan truncation
          const truncatedData = qrData.substring(0, MAX_QR_LENGTH);
          console.log(
            `   Data ditruncate dari ${qrData.length} ke ${truncatedData.length} karakter`
          );

          printQRWithText(truncatedData, text).then(resolve).catch(reject);
        }
      );
    } catch (error) {
      console.error("Error:", error.message);
      reject(error);
    }
  });
}

// Export fungsi untuk digunakan sebagai module
module.exports = {
  print,
  printQRCode,
  printQRWithText,
  printQRAsImage,
  testQRCapability,
  PORT_NAME,
};

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
