const express = require("express");
const cors = require("cors");
const {
  print,
  printQRCode,
  printQRWithText,
  testQRCapability,
  PORT_NAME,
} = require("./print-cmd");

const app = express();
const PORT = 3000;
const readline = require("readline");

// Global error handlers (prevent silent crashes)
process.on("uncaughtException", (error) => {
  console.error("\n❌ UNCAUGHT EXCEPTION:");
  console.error(error);
  console.log("\n⚠️  Server tetap berjalan. Tekan CTRL+C untuk keluar.\n");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("\n❌ UNHANDLED REJECTION:");
  console.error("Reason:", reason);
  console.log("\n⚠️  Server tetap berjalan. Tekan CTRL+C untuk keluar.\n");
});

// Helper function untuk membersihkan HTML tags dari log
const stripHtmlTags = (str) => str.replace(/<[^>]*>/g, "");

// Middleware CORS - Izinkan semua origin
app.use(cors());

// Middleware untuk parse JSON dan text
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// Endpoint POST /print
app.post("/print", async (req, res) => {
  try {
    // Check jika request adalah QR Code (data_b64)
    if (req.body.data_b64) {
      const qrData = req.body.data_b64;

      if (!qrData || qrData.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "data_b64 tidak boleh kosong",
        });
      }

      console.log(
        `\n📱 Menerima request QR Code: "${qrData.substring(0, 50)}${
          qrData.length > 50 ? "..." : ""
        }"`
      );

      // Print QR Code
      await printQRCode(qrData);

      return res.json({
        success: true,
        message: "QR Code berhasil dicetak",
        data: {
          type: "qrcode",
          data: qrData,
          port: PORT_NAME,
        },
      });
    }

    // Jika bukan QR Code, ambil text dari body (support JSON dan plain text)
    let text;

    if (typeof req.body === "string") {
      // Plain text
      text = req.body;
    } else if (req.body.text) {
      // JSON dengan property "text"
      text = req.body.text;
    } else if (req.body.message) {
      // JSON dengan property "message"
      text = req.body.message;
    } else {
      // Convert object ke string
      text = JSON.stringify(req.body);
    }

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Body tidak boleh kosong",
      });
    }

    // Log tanpa HTML tags agar lebih rapi
    const cleanText = stripHtmlTags(text);
    const preview =
      cleanText.length > 100 ? cleanText.substring(0, 100) + "..." : cleanText;
    console.log(`\n📝 Menerima request print: "${preview}"`);

    // Cetak ke printer
    await print(text);

    res.json({
      success: true,
      message: "Data berhasil dicetak",
      data: {
        type: "text",
        text: text,
        port: PORT_NAME,
      },
    });
  } catch (error) {
    console.error("❌ Error saat print:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint POST /printqr - Print QR Code dengan text
app.post("/printqr", async (req, res) => {
  try {
    const { qr_string, text } = req.body;

    // Validasi qr_string
    if (!qr_string || qr_string.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "qr_string tidak boleh kosong",
      });
    }

    console.log(`\n📱 Menerima request Print QR:`);
    console.log(
      `   QR: ${qr_string.substring(0, 50)}${
        qr_string.length > 50 ? "..." : ""
      }`
    );
    if (text)
      console.log(
        `   Text: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
      );

    // Print QR Code + Text
    await printQRWithText(qr_string, text || "");

    res.json({
      success: true,
      message: "QR Code berhasil dicetak",
      data: {
        qr_string: qr_string,
        text: text || "",
        port: PORT_NAME,
      },
    });
  } catch (error) {
    console.error("❌ Error saat print QR:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint GET / (Info)
app.get("/", (req, res) => {
  res.json({
    name: "Print Server",
    version: "1.0.0",
    status: "running",
    port: PORT_NAME,
    endpoints: {
      print: {
        method: "POST",
        path: "/print",
        description: "Cetak text atau QR code ke printer",
        examples: {
          text: { text: "Hello Printer" },
          qrcode: { data_b64: "https://example.com" },
        },
      },
      printqr: {
        method: "POST",
        path: "/printqr",
        description: "Cetak QR Code dengan text di bawahnya",
        examples: {
          qr_only: { qr_string: "https://example.com" },
          qr_with_text: {
            qr_string: "https://example.com",
            text: "Scan untuk info lebih lanjut",
          },
        },
      },
      testqr: {
        method: "POST",
        path: "/test-qr",
        description: "Test apakah printer support QR code (diagnostic)",
        note: "Akan mencetak QR code test sederhana untuk diagnose capability",
      },
      testprintqr: {
        method: "GET",
        path: "/test-printqr",
        description: "Test print QR code dengan GET (browser-friendly)",
        examples: {
          short: "GET /test-printqr?data=TEST",
          with_text: "GET /test-printqr?data=TEST&text=Hello",
        },
      },
      testqris: {
        method: "GET",
        path: "/test-qris",
        description: "Test print QRIS panjang >140 karakter (mode: image)",
        note: "Untuk QRIS yang melebihi batas 140 karakter native QR",
        examples: {
          qris: "GET /test-qris?data=YOUR_LONG_QRIS_232_CHARS&text=Scan untuk bayar",
        },
      },
      health: {
        method: "GET",
        path: "/health",
        description: "Cek status server",
      },
    },
  });
});

// Endpoint GET /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT_NAME,
  });
});

// Endpoint POST /test-qr - Test QR Code capability
app.post("/test-qr", async (req, res) => {
  try {
    console.log("\n🔍 Test QR Code capability diminta...");

    const result = await testQRCapability();

    res.json({
      success: true,
      message: result.message,
      instructions: {
        step1: "Cek printer Anda",
        step2:
          "Jika QR code muncul dengan text 'QR Test: TEST' = Printer SUPPORT QR ✓",
        step3:
          "Jika hanya muncul text 'QR Test: TEST' tanpa QR = Printer NOT SUPPORT QR ✗",
      },
      testData: result.testData,
      port: PORT_NAME,
    });
  } catch (error) {
    console.error("❌ Error test QR:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint GET /test-printqr - Test print QR dengan parameter mudah
// Start server
app.listen(PORT, async () => {
  console.log(`
🌐 Host: http://localhost:${PORT}
🖨️ Printer Port: ${PORT_NAME}

📌 Endpoints:
   - GET  /          - Server info
   - GET  /health    - Health check
   - POST /print     - Print text
   - POST /printqr   - Print QR Code with text
   - POST /test-qr   - Test QR capability 🔍

⌨️  Keyboard Shortcuts:
   - Tekan 't' + Enter = Test Print
   - Tekan 'q' + Enter = Test QR Print (dengan input panjang karakter)
   - Tekan 'x' + Enter = Exit Server
   - Tekan 'h' + Enter = Help

✨ Printer Ready!
`);

  // Setup keyboard input listener
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Listen untuk keyboard input
  rl.on("line", async (input) => {
    const key = input.trim().toLowerCase();

    if (key === "t") {
      // Test Print
      console.log("\n🖨️  Test Print...");
      try {
        const timestamp = new Date().toLocaleString("id-ID");
        await print(
          `<center><b>TEST PRINT</b></center>\n` +
            `Printer: ${PORT_NAME}\n` +
            `Port: ${PORT}\n` +
            `Time: ${timestamp}\n` +
            `Status: ✓ Online`
        );
        console.log("✅ Test print berhasil!\n");
      } catch (error) {
        console.error("❌ Test print gagal:", error.message);
        console.error("   Pastikan printer terhubung ke", PORT_NAME, "\n");
      }
    } else if (key === "q") {
      // Test QR Print dengan input panjang karakter
      console.log("\n🖨️  Test QR Print");

      // Fungsi untuk generate random string
      const generateRandomString = (length) => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Pause line listener dan tanya panjang karakter
      rl.pause();

      const question = (query) => {
        return new Promise((resolve) => {
          rl.question(query, resolve);
        });
      };

      (async () => {
        try {
          const answer = await question(
            "Berapa karakter QR yang ingin dicetak? (max 300): "
          );
          const length = parseInt(answer);

          if (isNaN(length) || length <= 0) {
            console.log("❌ Input tidak valid. Harus angka positif.\n");
            rl.resume();
            return;
          }

          if (length > 300) {
            console.log("❌ Maksimal 300 karakter!\n");
            rl.resume();
            return;
          }

          console.log(`\n📊 Generating QR dengan ${length} karakter...`);
          const randomData = generateRandomString(length);
          console.log(
            `   Data: ${randomData.substring(0, 50)}${length > 50 ? "..." : ""}`
          );
          console.log(`   Panjang: ${randomData.length} karakter\n`);

          await printQRWithText(randomData, `Test QR - ${length} chars`);
          console.log("✅ Test QR print berhasil!\n");
        } catch (error) {
          console.error("❌ Test QR print gagal:", error.message, "\n");
        } finally {
          rl.resume();
        }
      })();
    } else if (key === "x" || key === "exit" || key === "quit") {
      // Exit server
      console.log("\n👋 Server shutting down...");
      rl.close();
      process.exit(0);
    } else if (key === "h") {
      // Help
      console.log(`
⌨️  Keyboard Shortcuts:
   t = Test Print (text)
   q = Test QR Print (akan tanya panjang karakter, max 300)
   x = Exit Server (atau ketik 'exit' / 'quit')
   h = Help (this message)
`);
    }
  });
});
