# Print Server API Documentation

Server HTTP untuk mencetak text ke printer via COM port.

## Base URL
```
http://localhost:3000
```

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
      "description": "Cetak text ke printer"
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
  "timestamp": "2025-12-09T06:19:02.521Z",
  "port": "COM1"
}
```

---

### 3. POST /print - Print Text
Mencetak text ke printer via COM port.

#### Cara 1: JSON Body (dengan property "text")

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
    "text": "Hello Printer!",
    "port": "COM1"
  }
}
```

#### Cara 2: JSON Body (dengan property "message")

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"message":"Invoice #12345"}'
```

#### Cara 3: Plain Text

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: text/plain" \
  -d "Hello from plain text"
```

#### Cara 4: Form Data

**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -d "text=Hello from form"
```

---

## Error Responses

### Body Kosong
**Request:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"text":""}'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Body tidak boleh kosong"
}
```

### Printer Error
**Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Contoh Penggunaan

### Dari JavaScript/Node.js

```javascript
const axios = require('axios');

// Menggunakan axios
async function print(text) {
  try {
    const response = await axios.post('http://localhost:3000/print', {
      text: text
    });
    console.log('Print berhasil:', response.data);
  } catch (error) {
    console.error('Print gagal:', error.response.data);
  }
}

print('Hello from JavaScript!');
```

### Dari Python

```python
import requests

def print_text(text):
    response = requests.post('http://localhost:3000/print', json={
        'text': text
    })
    print(response.json())

print_text('Hello from Python!')
```

### Dari PHP

```php
<?php
$url = 'http://localhost:3000/print';
$data = array('text' => 'Hello from PHP!');

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
echo $result;
?>
```

### Dari PowerShell

```powershell
$body = @{
    text = "Hello from PowerShell!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/print" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Dari Browser (JavaScript)

```javascript
fetch('http://localhost:3000/print', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello from Browser!'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

---

## Menjalankan Server

### Start Server
```bash
npm start
```
atau
```bash
node server.js
```

### Development Mode (dengan auto-reload)
```bash
npm run dev
```

### Konfigurasi

Edit file `print-cmd.js` untuk mengubah port COM:
```javascript
const PORT_NAME = "COM1"; // Ganti dengan port Anda
```

Edit file `server.js` untuk mengubah port HTTP:
```javascript
const PORT = 3000; // Ganti dengan port yang diinginkan
```
