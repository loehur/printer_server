const express = require("express");
const cors = require("cors");
const { print, printQRCode, printQRWithText, PORT_NAME } = require("./print-cmd");

const app = express();
const PORT = 3000;

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

      console.log(`\n📱 Menerima request QR Code: "${qrData.substring(0, 50)}${qrData.length > 50 ? "..." : ""}"`);

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

    console.log(`\n📝 Menerima request print: "${text}"`);

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
    console.log(`   QR: ${qr_string.substring(0, 50)}${qr_string.length > 50 ? "..." : ""}`);
    if (text) console.log(`   Text: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`);

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
            text: "Scan untuk info lebih lanjut"
          },
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

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║       🖨️  Print Server Started        ║
╚═══════════════════════════════════════╝

🌐 Server running at: http://localhost:${PORT}
🖨️  Printer port: ${PORT_NAME}

📌 Endpoints:
   GET  /          - Server info
   GET  /health    - Health check
   POST /print     - Print text

💡 Contoh penggunaan:
   curl -X POST http://localhost:${PORT}/print -H "Content-Type: application/json" -d "{\\"text\\":\\"TEST\\"}"
   curl -X POST http://localhost:${PORT}/print -H "Content-Type: text/plain" -d "TEST"

✨ Server siap menerima request!
`);
});
