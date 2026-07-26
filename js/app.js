/**
 * VOTE-SYNC CYBER CORE - SPA APPLICATION CONTROLLER
 * File: js/app.js
 * Description: Controller utama UI, penanganan event, Chart.js, modal, dan export.
 */

let chartClaimsInstance = null;
let chartKubuInstance = null;
let heartbeatTimer = null;

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initAuth();
    initApp();
});

/**
 * Bootstrapping aplikasi
 */
async function initApp() {
    // Sinkronkan URL GAS di input settings jika ada
    const savedGasUrl = localStorage.getItem(CONFIG.STORAGE_KEY_GAS_URL);
    const settingGasUrlInput = document.getElementById('setting-gas-url');
    if (settingGasUrlInput && savedGasUrl) {
        settingGasUrlInput.value = savedGasUrl;
    }

    updateApiStatusIndicator();
    await loadDashboardData();
    startHeartbeatLoop();
}

/**
 * Loop Pemantau Koneksi & Auto-Resync Realtime (Heartbeat)
 */
function startHeartbeatLoop() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    // Cek langsung saat aplikasi dimuat
    runHealthCheckProcess();

    // Jalankan pemeriksaan periodik setiap 10 detik
    heartbeatTimer = setInterval(runHealthCheckProcess, 10000);
}

/**
 * Proses Eksekusi Cek Koneksi & Auto-Sync
 */
async function runHealthCheckProcess() {
    const isAlive = await API.pingHealthCheck();

    if (isAlive) {
        if (state.connectionStatus !== 'CONNECTED') {
            state.connectionStatus = 'CONNECTED';
            showToast(`🟢 Terhubung ke Backend GAS (${state.latencyMs}ms)`, 'success');

            // Auto-Resync Data jika sebelumnya sempat putus / terhubung kembali
            if (state.wasOffline) {
                showToast('⚡ Mengunduh ulang data terbaru secara otomatis...', 'info');
                await loadDashboardData();
                state.wasOffline = false;
            }
        }
    } else {
        if (state.connectionStatus === 'CONNECTED') {
            state.wasOffline = true;
            showToast('⚠️ Koneksi Backend GAS Terputus! Beralih ke Mode Standby.', 'error');
        }
        state.connectionStatus = state.gasApiUrl ? 'DISCONNECTED' : 'DEMO';
    }

    updateHealthUI();
}

/**
 * Update Indikator UI Koneksi Topbar
 */
function updateHealthUI() {
    const pingDot = document.getElementById('core-status-ping');
    const textLabel = document.getElementById('core-status-text');
    const latencyLabel = document.getElementById('core-status-latency');

    if (!pingDot || !textLabel || !latencyLabel) return;

    if (state.connectionStatus === 'CONNECTED') {
        pingDot.className = 'w-2.5 h-2.5 rounded-full bg-cyber-green animate-pulse-fast';
        textLabel.className = 'font-mono text-xs text-cyber-green tracking-widest uppercase';
        textLabel.textContent = 'CORE STATUS: ONLINE';
        latencyLabel.textContent = `${state.latencyMs} ms`;
        latencyLabel.className = 'font-mono text-[10px] text-cyber-green bg-cyber-green/10 px-1.5 py-0.5 rounded border border-cyber-green/30';
    } else if (state.connectionStatus === 'DISCONNECTED') {
        pingDot.className = 'w-2.5 h-2.5 rounded-full bg-cyber-red animate-pulse-fast';
        textLabel.className = 'font-mono text-xs text-cyber-red tracking-widest uppercase';
        textLabel.textContent = 'CORE STATUS: OFFLINE';
        latencyLabel.textContent = 'TIMEOUT';
        latencyLabel.className = 'font-mono text-[10px] text-cyber-red bg-cyber-red/10 px-1.5 py-0.5 rounded border border-cyber-red/30';
    } else {
        pingDot.className = 'w-2.5 h-2.5 rounded-full bg-cyber-yellow';
        textLabel.className = 'font-mono text-xs text-cyber-yellow tracking-widest uppercase';
        textLabel.textContent = 'CORE STATUS: DEMO MOCK';
        latencyLabel.textContent = 'LOCAL';
        latencyLabel.className = 'font-mono text-[10px] text-cyber-yellow bg-cyber-yellow/10 px-1.5 py-0.5 rounded border border-cyber-yellow/30';
    }
}

/**
 * Pindah Tab Single Page Application
 */
function switchTab(tabId) {
    // Update tombol navigasi
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) targetNav.classList.add('active');

    // Tampilkan panel tab target
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.remove('hidden');

    // Trigger render spesifik tab
    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'warga') loadVotersData();
    if (tabId === 'double') loadDuplicatesData();
    if (tabId === 'radar') loadRadarData();
}

/**
 * Memuat data dashboard & merender grafik
 */
async function loadDashboardData() {
    try {
        const res = await API.request('getDashboardStats');
        const stats = res.data;

        document.getElementById('stat-total-records').textContent = stats.totalRecords || 0;
        document.getElementById('stat-unique-voters').textContent = stats.uniqueVoters || 0;
        document.getElementById('stat-double-claims').textContent = stats.doubleClaims || 0;
        document.getElementById('stat-sync-health').textContent = stats.syncHealth || '100%';
        document.getElementById('badge-double-count').textContent = stats.doubleClaims || 0;

        renderCharts(stats);
    } catch (e) {
        console.error('Gagal memuat statistik:', e);
    }
}

/**
 * Inisialisasi dan Update Chart.js
 */
function renderCharts(stats) {
    const ctxDoughnut = document.getElementById('chartClaimsDoughnut');
    const ctxBar = document.getElementById('chartKubuBar');

    if (!ctxDoughnut || !ctxBar) return;

    // Destroy chart lama jika ada
    if (chartClaimsInstance) chartClaimsInstance.destroy();
    if (chartKubuInstance) chartKubuInstance.destroy();

    // Chart Doughnut Distribusi Klaim
    chartClaimsInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Pemilih Unik', 'Klaim Ganda (Double)'],
            datasets: [{
                data: [stats.uniqueVoters || 1, stats.doubleClaims || 0],
                backgroundColor: ['#00ff66', '#ff003c'],
                borderColor: '#050811',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e2e8f0', font: { family: 'Share Tech Mono' } } } }
        }
    });

    // Chart Bar Perbandingan Kubu
    chartKubuInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['KUBU 1', 'KUBU 2'],
            datasets: [{
                label: 'Jumlah Klaim Pemilih',
                data: [stats.kubu1Count || 0, stats.kubu2Count || 0],
                backgroundColor: ['rgba(0, 240, 255, 0.7)', 'rgba(255, 183, 3, 0.7)'],
                borderColor: ['#00f0ff', '#ffb703'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: { legend: { labels: { color: '#e2e8f0', font: { family: 'Share Tech Mono' } } } }
        }
    });
}

/**
 * Memuat dan menampilkan daftar warga
 */
async function loadVotersData() {
    const res = await API.request('getVoters');
    state.voters = res.data || [];
    filterVotersTable();
}

/**
 * Filter tabel pemilih berdasarkan query pencarian
 */
function filterVotersTable() {
    const searchQuery = (document.getElementById('search-voters')?.value || '').toLowerCase();
    const filterClaim = document.getElementById('filter-claimed-by')?.value || 'ALL';
    const tbody = document.getElementById('voters-table-body');

    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = state.voters.filter(v => {
        const matchesSearch = String(v.NIK).toLowerCase().includes(searchQuery) ||
                              String(v.NAMA).toLowerCase().includes(searchQuery) ||
                              `rt ${v.RT} rw ${v.RW}`.toLowerCase().includes(searchQuery);
        const matchesFilter = filterClaim === 'ALL' || v.CLAIMED_BY === filterClaim;
        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">Tidak ada data warga ditemukan.</td></tr>`;
        return;
    }

    filtered.forEach(v => {
        const isDouble = v.IS_DUPLICATE === 'TRUE' || v.IS_DUPLICATE === true;
        const tr = document.createElement('tr');
        tr.className = isDouble ? 'bg-cyber-red/10 border-b border-cyber-red/20' : 'hover:bg-slate-800/40 border-b border-slate-800/60';
        
        tr.innerHTML = `
            <td class="p-3 ${isDouble ? 'text-cyber-red font-bold' : 'text-slate-300'}">${v.NIK}</td>
            <td class="p-3 text-white font-bold uppercase">${v.NAMA}</td>
            <td class="p-3 text-slate-400">RT ${v.RT} / RW ${v.RW}</td>
            <td class="p-3 text-cyber-neon">${v.KUBU_ORIGIN}</td>
            <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isDouble ? 'bg-cyber-red text-white glow-neon-red' : 'bg-cyber-green/20 text-cyber-green'}">
                    ${v.CLAIMED_BY}
                </span>
            </td>
            <td class="p-3 text-center text-cyber-yellow">${v.CONFIDENCE_SCORE || 100}%</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Memuat log NIK ganda
 */
async function loadDuplicatesData() {
    const res = await API.request('getDuplicates');
    state.duplicates = res.data || [];
    renderDuplicatesTable();
}

/**
 * Merender tabel NIK ganda
 */
function renderDuplicatesTable() {
    const tbody = document.getElementById('duplicates-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.duplicates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-cyber-green font-bold">✨ Luar biasa! Tidak terdeteksi adanya bentrok NIK ganda saat ini.</td></tr>`;
        return;
    }

    state.duplicates.forEach(v => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-cyber-red/20 border-b border-cyber-red/30';
        tr.innerHTML = `
            <td class="p-3 text-cyber-red font-bold font-mono tracking-wider">${v.NIK}</td>
            <td class="p-3 text-white font-bold uppercase">${v.NAMA}</td>
            <td class="p-3 text-slate-300">RT ${v.RT} / RW ${v.RW}</td>
            <td class="p-3 text-cyber-yellow">${v.CLAIMED_BY}</td>
            <td class="p-3 text-center font-bold text-cyber-red">${v.CONFIDENCE_SCORE || 100}%</td>
            <td class="p-3 text-right">
                <button onclick="openResolveModal('${v.NIK}')" class="px-2.5 py-1 rounded bg-cyber-red border border-cyber-red text-white text-[11px] hover:bg-red-700 transition-all">
                    SOLUSI KONFLIK
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Memuat dan menampilkan Radar Wilayah
 */
async function loadRadarData() {
    const res = await API.request('getRadarWilayah');
    state.radar = res.data || [];
    renderRadarGrid();
}

/**
 * Merender grid kartu radar wilayah
 */
function renderRadarGrid() {
    const container = document.getElementById('radar-grid-container');
    if (!container) return;
    container.innerHTML = '';

    state.radar.forEach(r => {
        const isHighRisk = r.anomalyPercentage > 20;
        const card = document.createElement('div');
        card.className = `p-4 rounded-lg border ${isHighRisk ? 'cyber-glass-red' : 'cyber-glass'} space-y-2`;
        
        card.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-orbitron font-bold text-sm ${isHighRisk ? 'text-cyber-red' : 'text-cyber-neon'}">RT ${r.rt} / RW ${r.rw}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono ${isHighRisk ? 'bg-cyber-red text-white animate-pulse-fast' : 'bg-slate-800 text-slate-300'}">
                    ${r.anomalyPercentage}% ANOMALI
                </span>
            </div>
            <div class="flex justify-between text-xs font-mono text-slate-400">
                <span>Total Pemilih: <strong class="text-white">${r.total}</strong></span>
                <span>Data Double: <strong class="text-cyber-red">${r.duplicates}</strong></span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div class="h-full ${isHighRisk ? 'bg-cyber-red' : 'bg-cyber-neon'}" style="width: ${Math.min(r.anomalyPercentage, 100)}%"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Menjalankan deduplikasi manual
 */
async function triggerDeduplication() {
    showToast('Menjalankan engine deduplikasi data...', 'info');
    try {
        const res = await API.request('runDeduplication', {}, 'POST');
        showToast(res.message || 'Deduplikasi selesai!', 'success');
        await loadDashboardData();
    } catch (e) {
        showToast(`Gagal deduplikasi: ${e.message}`, 'error');
    }
}

/**
 * Simpan konfigurasi URL backend GAS
 */
function saveGasUrlConfig() {
    const url = document.getElementById('setting-gas-url')?.value.trim();
    if (!url) {
        localStorage.removeItem(CONFIG.STORAGE_KEY_GAS_URL);
        state.gasApiUrl = '';
        showToast('URL GAS dihapus. Beralih ke Mode Demo.', 'info');
    } else {
        localStorage.setItem(CONFIG.STORAGE_KEY_GAS_URL, url);
        state.gasApiUrl = url;
        showToast('Konfigurasi URL GAS Backend disimpan!', 'success');
    }
    updateApiStatusIndicator();
    loadDashboardData();
}

/**
 * Indicator status backend di topbar
 */
function updateApiStatusIndicator() {
    const label = document.getElementById('api-mode-label');
    if (label) {
        label.textContent = state.gasApiUrl ? 'LIVE GAS BACKEND' : 'DEMO MOCK';
        label.className = state.gasApiUrl ? 'text-cyber-green font-bold' : 'text-cyber-yellow';
    }
}

// Modal Input Warga
function openAddVoterModal() { document.getElementById('modal-add-voter')?.classList.remove('hidden'); }
function closeAddVoterModal() { document.getElementById('modal-add-voter')?.classList.add('hidden'); }

// Modal Resolusi Konflik
function openResolveModal(nik) {
    const voter = state.voters.find(v => v.NIK === nik) || state.duplicates.find(v => v.NIK === nik);
    if (!voter) return;

    document.getElementById('res-target-nik').textContent = voter.NIK;
    document.getElementById('res-confidence').textContent = `${voter.CONFIDENCE_SCORE || 100}%`;
    document.getElementById('res-k1-nama').textContent = voter.NAMA;
    document.getElementById('res-k1-rtrw').textContent = `RT ${voter.RT} / RW ${voter.RW}`;
    document.getElementById('res-k2-nama').textContent = voter.NAMA;
    document.getElementById('res-k2-rtrw').textContent = `RT ${voter.RT} / RW ${voter.RW}`;

    document.getElementById('modal-resolve-duplicate')?.classList.remove('hidden');
}
function closeResolveModal() { document.getElementById('modal-resolve-duplicate')?.classList.add('hidden'); }

function submitResolution(choice) {
    showToast(`Resolusi '${choice}' berhasil diterapkan!`, 'success');
    closeResolveModal();
    loadDashboardData();
}

/**
 * Export data duplikat ke CSV
 */
function exportDuplicatesToCSV() {
    if (state.duplicates.length === 0) {
        showToast('Tidak ada data duplikat untuk diexport.', 'warning');
        return;
    }

    let csv = 'NIK,NAMA,RT,RW,CLAIMED_BY,CONFIDENCE_SCORE\n';
    state.duplicates.forEach(d => {
        csv += `"${d.NIK}","${d.NAMA}","${d.RT}","${d.RW}","${d.CLAIMED_BY}","${d.CONFIDENCE_SCORE || 100}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `REPORT_DUPLIKAT_VOTE_SYNC_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV berhasil diunduh.', 'success');
}

/**
 * Cetak Laporan Audit Duplikat
 */
function printDuplicateReport() {
    window.print();
}

/**
 * Sistem Toast Notification Cyber
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colorClass = type === 'error' ? 'border-cyber-red text-cyber-red bg-slate-950/90' :
                       type === 'success' ? 'border-cyber-green text-cyber-green bg-slate-950/90' :
                       type === 'warning' ? 'border-cyber-yellow text-cyber-yellow bg-slate-950/90' :
                       'border-cyber-neon text-cyber-neon bg-slate-950/90';

    toast.className = `px-4 py-3 rounded border font-mono text-xs shadow-lg backdrop-blur-md transition-all duration-300 ${colorClass}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
