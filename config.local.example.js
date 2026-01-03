// Konfigurasi lokal - Copy file ini ke config.local.js dan ubah sesuai kebutuhan
// File config.local.js TIDAK di-track git

module.exports = {
    PORT_NAME: "COM1", // Ganti dengan port printer Anda (COM1, COM2, COM3, dll)
    LINE_WIDTH: 32, // Lebar baris untuk printer (32 untuk 58mm, 48 untuk 80mm)
    PRINT_TIMEOUT: 10000, // Timeout untuk operasi print dalam milliseconds (10 detik)
    LINE_SPACING: 34, // Line spacing dalam unit 1/180 inch (default: 30, lebih besar = lebih renggang)
    MAX_QR_LENGTH: 300, // LIMIT HARDWARE: Maksimal karakter untuk QR Code
    QR_SIZE: 6, // QR Code size (1-16, semakin besar semakin besar ukurannya)
    QR_ERROR_LEVEL: 48, // 48 = Level L (Low), 49 = M, 50 = Q, 51 = H
};
