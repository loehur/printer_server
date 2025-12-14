# Print Server API Documentation

Server HTTP untuk mencetak text dan QR code ke printer thermal via COM port.

## Base URL
```
http://localhost:3000
```

## Table of Contents
- [Endpoints](#endpoints)
  - [GET /](#1-get----server-info)
  - [GET /health](#2-get-health---health-check)
  - [POST /print](#3-post-print---print-text)
  - [POST /printqr](#4-post-printqr---print-qr-code)
- [Parameters](#parameters)
- [HTML Formatting](#html-formatting-tags)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Code Examples](#contoh-penggunaan)
- [Configuration](#konfigurasi)

---

## Endpoints

### 1. GET / - Server Info
Mendapatkan informasi tentang server dan endpoint yang tersedia.

**Request:**
```bash
curl http://localhost:3000/
```

**Response:**
```json
{
  "name": "Print Server",
  "version": "1.0.0",
  "status": "running",
  "port": "COM1",
  "endpoints": {
    "print": {
      "method": "POST",
      "path": "/print",
      "description": "Cetak text atau QR code ke printer"
    },
    "printqr": {
      "method": "POST",
      "path": "/printqr",
      "description": "Cetak QR Code dengan text di bawahnya"
    },
    "health": {
      "method": "GET",
      "path": "/health",
      "description": "Cek status server"
    }
  }
}
```

---

### 2. GET /health - Health Check
Mengecek status server.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-14T08:00:00.000Z",
  "port": "COM1"
}
```

---

### 3. POST /print - Print Text

Mencetak text ke printer dengan dukungan HTML formatting tags.

#### Basic Request

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello Printer!"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Data berhasil dicetak",
  "data": {
    "type": "text",
    "text": "Hello Printer!",
    "margin_top": 0,
    "feed_lines": 0,
    "port": "COM1"
  }
}
```

#### Request dengan Margin & Feed

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello Printer!",
    "margin_top": 2,
    "feed_lines": 3
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Data berhasil dicetak",
  "data": {
    "type": "text",
    "text": "Hello Printer!",
    "margin_top": 2,
    "feed_lines": 3,
    "port": "COM1"
  }
}
```

**Hasil Cetak:**
```
[2 baris kosong di atas]
Hello Printer!
[3 baris kosong di bawah]
```

#### Request dengan HTML Formatting

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<center><h1>INVOICE</h1></center><b>No:</b> #12345<br><b>Date:</b> 2025-12-14"
  }'
```

---

### 4. POST /printqr - Print QR Code

Mencetak QR code dengan optional text di bawahnya.

#### Basic QR Code

**Request:**
```bash
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{
    "qr_string": "https://example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "QR Code berhasil dicetak",
  "data": {
    "qr_string": "https://example.com",
    "text": "",
    "margin_top": 0,
    "feed_lines": 0,
    "port": "COM1"
  }
}
```

#### QR Code dengan Text

**Request:**
```bash
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{
    "qr_string": "https://example.com",
    "text": "Scan untuk info lebih lanjut"
  }'
```

#### QR Code dengan Margin & Feed

**Request:**
```bash
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{
    "qr_string": "https://example.com",
    "text": "Scan QR Code",
    "margin_top": 1,
    "feed_lines": 5
  }'
```

**Hasil Cetak:**
```
[1 baris kosong di atas]
[QR CODE]
Scan QR Code
[5 baris kosong di bawah]
```

#### QR Code untuk QRIS

**Request:**
```bash
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{
    "qr_string": "00020101021226740025ID.CO.BANKNEOCOMMERCE.WWW01189360049...",
    "text": "QRIS Payment",
    "margin_top": 2,
    "feed_lines": 4
  }'
```

**Note:**
- QR code maksimal 206 karakter (hardware limitation)
- Data lebih dari 206 karakter akan dipotong otomatis
- QRIS string yang terlalu panjang mungkin tidak dapat dicetak penuh

---

## Parameters

### Common Parameters (semua endpoint)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `margin_top` | number | ❌ | `0` | Jumlah baris kosong di atas konten |
| `feed_lines` | number | ❌ | `0` | Jumlah baris kosong di bawah konten |

### POST /print Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | ✅ | - | Text yang akan dicetak (support HTML tags) |
| `message` | string | ✅* | - | Alternatif untuk `text` |

*) Salah satu dari `text` atau `message` harus ada

### POST /printqr Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `qr_string` | string | ✅ | - | Data yang akan di-encode ke QR (max 206 chars) |
| `text` | string | ❌ | `""` | Text yang ditampilkan di bawah QR code |

---

## HTML Formatting Tags

Server mendukung HTML tags berikut untuk formatting text:

### Text Formatting

| Tag | Fungsi | Contoh |
|-----|--------|--------|
| `<b>...</b>` | Bold/tebal | `<b>TOTAL</b>` |
| `<h1>...</h1>` | Huruf besar 2x2 | `<h1>INVOICE</h1>` |

### Alignment

| Tag | Fungsi | Contoh |
|-----|--------|--------|
| `<center>...</center>` | Rata tengah | `<center>TOKO ABC</center>` |
| `<left>...</left>` | Rata kiri | `<left>Nama</left>` |
| `<right>...</right>` | Rata kanan | `<right>Rp 10.000</right>` |

**Note:** Closing tag alignment bersifat opsional

### Line Breaks

| Tag | Fungsi | Contoh |
|-----|--------|--------|
| `<br>` atau `<br/>` | Baris baru | `Line 1<br>Line 2` |
| `\n` | Baris baru | `Line 1\nLine 2` |

### Table Columns

| Tag | Fungsi | Contoh |
|-----|--------|--------|
| `<tr>...</tr>` | Table row | `<tr><td>Kiri</td><td>Kanan</td></tr>` |
| `<td>...</td>` | Table data/kolom | `<td>Column 1</td>` |

**Kolom Behavior:**
- 1 kolom: otomatis rata tengah
- 2 kolom: kolom 1 di kiri, kolom 2 di kanan
- 3+ kolom: hanya 2 kolom pertama yang diproses

### Contoh Kombinasi

```json
{
  "text": "<center><h1><b>STRUK BELANJA</b></h1></center><br><tr><td>Barang A</td><td>Rp 10.000</td></tr><tr><td>Barang B</td><td>Rp 15.000</td></tr><br><tr><td><b>TOTAL</b></td><td><b>Rp 25.000</b></td></tr>"
}
```

**Hasil:**
```
      STRUK BELANJA
      (2x size, bold)

Barang A              Rp 10.000
Barang B              Rp 15.000

TOTAL                 Rp 25.000
```

---

## Keyboard Shortcuts

Saat server berjalan, tekan tombol berikut di terminal:

| Tombol | Fungsi |
|--------|--------|
| `t` + Enter | Test Print (cetak test dengan info timestamp) |
| `q` + Enter | Test QR Print (input jumlah karakter 1-300) |
| `x` + Enter | Exit Server |
| `h` + Enter | Help (tampilkan daftar shortcuts) |

**Contoh flow 'q' shortcut:**
```
> q [Enter]
Berapa karakter QR yang ingin dicetak? (max 300): 150 [Enter]

📊 Generating QR dengan 150 karakter...
   Data: aB3kL9mXp2qR5tYu8vW1nZ4cD7fG0hJ6sK2lM9pQ5rT8u...
   Panjang: 150 karakter

✅ Test QR print berhasil!
```

---

## Error Responses

### 400 Bad Request - Body Kosong

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"text":""}'
```

**Response:**
```json
{
  "success": false,
  "error": "Body tidak boleh kosong"
}
```

### 400 Bad Request - QR String Kosong

**Request:**
```bash
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{"qr_string":""}'
```

**Response:**
```json
{
  "success": false,
  "error": "qr_string tidak boleh kosong"
}
```

### 500 Internal Server Error - Printer Error

**Response:**
```json
{
  "success": false,
  "error": "Timeout: Operasi print melebihi 10 detik. COM port mungkin tidak ready atau sedang sibuk."
}
```

---

## Contoh Penggunaan

### JavaScript/Node.js (axios)

```javascript
const axios = require('axios');

// Print text dengan margin
async function printText(text, marginTop = 0, feedLines = 0) {
  try {
    const response = await axios.post('http://localhost:3000/print', {
      text: text,
      margin_top: marginTop,
      feed_lines: feedLines
    });
    console.log('✅ Print berhasil:', response.data);
  } catch (error) {
    console.error('❌ Print gagal:', error.response?.data || error.message);
  }
}

// Print QR code
async function printQR(qrData, text = '', marginTop = 0, feedLines = 0) {
  try {
    const response = await axios.post('http://localhost:3000/printqr', {
      qr_string: qrData,
      text: text,
      margin_top: marginTop,
      feed_lines: feedLines
    });
    console.log('✅ QR print berhasil:', response.data);
  } catch (error) {
    console.error('❌ QR print gagal:', error.response?.data || error.message);
  }
}

// Contoh penggunaan
printText('<center><b>INVOICE #12345</b></center>', 2, 3);
printQR('https://example.com', 'Scan untuk info', 1, 5);
```

### JavaScript/Node.js (fetch)

```javascript
// Print text
async function printText(text) {
  const response = await fetch('http://localhost:3000/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      margin_top: 1,
      feed_lines: 2
    })
  });
  const data = await response.json();
  console.log(data);
}

// Print QR
async function printQR(qrData, text = '') {
  const response = await fetch('http://localhost:3000/printqr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qr_string: qrData,
      text: text,
      margin_top: 2,
      feed_lines: 4
    })
  });
  const data = await response.json();
  console.log(data);
}

printText('Hello World!');
printQR('https://example.com', 'Scan QR Code');
```

### Python (requests)

```python
import requests

# Print text
def print_text(text, margin_top=0, feed_lines=0):
    response = requests.post('http://localhost:3000/print', json={
        'text': text,
        'margin_top': margin_top,
        'feed_lines': feed_lines
    })
    print(response.json())

# Print QR
def print_qr(qr_data, text='', margin_top=0, feed_lines=0):
    response = requests.post('http://localhost:3000/printqr', json={
        'qr_string': qr_data,
        'text': text,
        'margin_top': margin_top,
        'feed_lines': feed_lines
    })
    print(response.json())

# Contoh penggunaan
print_text('<center><b>INVOICE</b></center>', margin_top=2, feed_lines=3)
print_qr('https://example.com', text='Scan QR', margin_top=1, feed_lines=5)
```

### PHP

```php
<?php
function printText($text, $marginTop = 0, $feedLines = 0) {
    $url = 'http://localhost:3000/print';
    $data = array(
        'text' => $text,
        'margin_top' => $marginTop,
        'feed_lines' => $feedLines
    );

    $options = array(
        'http' => array(
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        )
    );

    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    return json_decode($result, true);
}

function printQR($qrData, $text = '', $marginTop = 0, $feedLines = 0) {
    $url = 'http://localhost:3000/printqr';
    $data = array(
        'qr_string' => $qrData,
        'text' => $text,
        'margin_top' => $marginTop,
        'feed_lines' => $feedLines
    );

    $options = array(
        'http' => array(
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        )
    );

    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    return json_decode($result, true);
}

// Contoh penggunaan
$result = printText('<center><b>INVOICE</b></center>', 2, 3);
print_r($result);

$qrResult = printQR('https://example.com', 'Scan QR', 1, 5);
print_r($qrResult);
?>
```

### PowerShell

```powershell
# Print text
$body = @{
    text = "<center><b>INVOICE</b></center>"
    margin_top = 2
    feed_lines = 3
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/print" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Print QR
$qrBody = @{
    qr_string = "https://example.com"
    text = "Scan QR Code"
    margin_top = 1
    feed_lines = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/printqr" `
    -Method POST `
    -Body $qrBody `
    -ContentType "application/json"
```

### cURL (Advanced Examples)

```bash
# Print invoice dengan formatting lengkap
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<center><h1>TOKO ABC</h1></center><center>Jl. Example No. 123</center><br><tr><td>Item A</td><td>Rp 10.000</td></tr><tr><td>Item B</td><td>Rp 15.000</td></tr><br><tr><td><b>TOTAL</b></td><td><b>Rp 25.000</b></td></tr>",
    "margin_top": 1,
    "feed_lines": 3
  }'

# Print QRIS
curl -X POST http://localhost:3000/printqr \
  -H "Content-Type: application/json" \
  -d '{
    "qr_string": "00020101021226740025ID.CO.BANKNEOCOMMERCE.WWW01189360049...",
    "text": "Scan untuk bayar",
    "margin_top": 2,
    "feed_lines": 4
  }'
```

---

## Konfigurasi

### Server Configuration (server.js)

```javascript
const PORT = 3000; // HTTP port (default: 3000)
```

### Printer Configuration (print-cmd.js)

```javascript
const PORT_NAME = "COM1";           // Printer COM port
const LINE_WIDTH = 32;              // Line width (32 for 58mm, 48 for 80mm)
const PRINT_TIMEOUT = 10000;        // Print timeout (ms)
const LINE_SPACING = 34;            // Line spacing (1/180 inch units)
const MAX_QR_LENGTH = 300;          // Max QR code length (chars)
const QR_SIZE = 6;                  // QR code size (1-16)
const QR_ERROR_LEVEL = 48;          // Error correction (48=L, 49=M, 50=Q, 51=H)
```

### Menjalankan Server

**Production:**
```bash
npm start
```

**Development (auto-reload):**
```bash
npm run dev
```

**Manual:**
```bash
node server.js
```

### Menghentikan Server

- Tekan `x` + Enter
- Atau tekan `Ctrl+C` (2x jika perlu)
- Atau ketik `exit` atau `quit` + Enter

---

## Technical Notes

### QR Code Specifications

- **Model:** QR Code Model 2
- **Size:** 6 (configurable 1-16)
- **Error Correction:** Level L (7%)
- **Max Capacity:** 206 characters (hardware limitation)
- **Encoding:** Alphanumeric

### Print Command

Server menggunakan Windows `type` command untuk mengirim data ke COM port:
```batch
type "temp_file.txt" > COM1
```

### Timeout Protection

Semua operasi print memiliki timeout 10 detik untuk mencegah server hang jika printer tidak ready.

### Supported Printer Types

- Thermal receipt printer 58mm
- Thermal receipt printer 80mm
- ESC/POS compatible printers
- Printers dengan COM port interface

---

## License

ISC

## Author

Print Server v1.0.0
