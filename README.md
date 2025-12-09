# Print Server

Aplikasi Node.js untuk mengirim data ke printer via port COM (Serial Port) dengan HTTP API.

## Fitur

- 🖨️ Print langsung ke COM port (mirip CMD `echo > COM1`)
- 🌐 HTTP REST API server
- 📡 Support JSON, Plain Text, dan Form Data
- ✅ Sudah terbukti berhasil mencetak

## Instalasi

```bash
npm install
```

## Penggunaan

### Mode 1: HTTP Server (RECOMMENDED)

#### 1. Start Server
```bash
npm start
```
atau
```bash
node server.js
```

Server akan berjalan di `http://localhost:3000`

#### 2. Kirim Request untuk Print
```bash
# Menggunakan JSON
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello Printer!"}'

# Menggunakan Plain Text
curl -X POST http://localhost:3000/print \
  -H "Content-Type: text/plain" \
  -d "Hello Printer!"
```

**Lihat [API.md](API.md) untuk dokumentasi API lengkap.**

---

### Mode 2: Command Line

#### Menggunakan print-cmd.js (Paling Sederhana)
```bash
node print-cmd.js "TEST"
node print-cmd.js "Invoice #12345"
```

#### Menggunakan print.js (Advanced)
```bash
# Mode direct (seperti echo > COM1)
node print.js direct "TEST"

# Mode serial (dengan kontrol penuh)
node print.js "TEST"

# List port tersedia
node print.js list
```

## Konfigurasi

### Ganti Port COM

Edit [print-cmd.js:4](print-cmd.js#L4):
```javascript
const PORT_NAME = "COM1"; // Ganti dengan port Anda (COM2, COM3, dll)
```

### Ganti Port HTTP Server

Edit [server.js](server.js):
```javascript
const PORT = 3000; // Ganti dengan port yang diinginkan
```

## File Struktur

```
print_server/
├── server.js         # HTTP API Server (MAIN)
├── print-cmd.js      # Print via CMD echo (SIMPLE & RELIABLE)
├── print.js          # Print via serialport library (ADVANCED)
├── package.json      # Dependencies
├── README.md         # Dokumentasi ini
└── API.md            # API Documentation
```

## Contoh Integrasi

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello!' })
});
```

### Python
```python
import requests
requests.post('http://localhost:3000/print', json={'text': 'Hello!'})
```

### PHP
```php
file_get_contents('http://localhost:3000/print', false,
  stream_context_create([
    'http' => [
      'method' => 'POST',
      'content' => json_encode(['text' => 'Hello!'])
    ]
  ])
);
```

Lihat [API.md](API.md) untuk contoh lebih lengkap.

## Troubleshooting

- **Printer tidak mencetak**: Pastikan port COM benar (cek dengan Device Manager)
- **Error "Access denied"**: Tutup aplikasi lain yang menggunakan port COM
- **Server tidak start**: Pastikan port 3000 tidak digunakan aplikasi lain

## Scripts

```bash
npm start        # Start HTTP server
npm run dev      # Start dengan auto-reload (nodemon)
npm run print    # Test print via command line
```
