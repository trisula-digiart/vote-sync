/**
 * VOTE-SYNC CYBER CORE - REST API ADAPTER
 * File: js/api.js
 * Description: Client API adapter untuk komunikasi HTTP dengan Google Apps Script Web App.
 */

const API = {
    /**
     * Generic fetch wrapper dengan CORS handling dan fallback demo mode.
     * @param {string} action - Nama action API backend
     * @param {Object} payload - Data body / query param
     * @param {string} method - GET / POST
     */
    async request(action, payload = {}, method = 'GET') {
        const gasUrl = state.gasApiUrl || localStorage.getItem(CONFIG.STORAGE_KEY_GAS_URL);
        
        // Mode Demo Mock Data jika GAS Endpoint belum diisi
        if (!gasUrl) {
            return this.handleMockFallback(action, payload);
        }

        try {
            let url = `${gasUrl}?action=${action}&token=${encodeURIComponent(state.token || '')}`;
            let options = {
                method: method,
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            };

            if (method === 'POST') {
                options.body = JSON.stringify({
                    action: action,
                    token: state.token,
                    ...payload
                });
            } else if (payload && Object.keys(payload).length > 0) {
                const params = new URLSearchParams(payload).toString();
                url += `&${params}`;
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ERROR') {
                throw new Error(data.message || 'Terjadi kesalahan sistem backend.');
            }

            return data;
        } catch (error) {
            console.warn('[API WARN] Gagal komunikasi dengan GAS. Beralih ke fallback data:', error.message);
            showToast(`Backend GAS offline/CORS error: ${error.message}. Menggunakan Mode Demo.`, 'warning');
            return this.handleMockFallback(action, payload);
        }
    },

    /**
     * Heartbeat Health Check untuk memantau konektivitas & latensi GAS Backend
     */
    async pingHealthCheck() {
        const gasUrl = state.gasApiUrl || localStorage.getItem(CONFIG.STORAGE_KEY_GAS_URL);
        if (!gasUrl) {
            state.connectionStatus = 'DEMO';
            state.latencyMs = 0;
            return false;
        }

        const startTime = performance.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 detik timeout

            const response = await fetch(`${gasUrl}?action=ping`, {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const endTime = performance.now();
            if (response.ok) {
                state.latencyMs = Math.round(endTime - startTime);
                return true;
            } else {
                state.latencyMs = 0;
                return false;
            }
        } catch (err) {
            state.latencyMs = 0;
            return false;
        }
    },

    /**
     * Menangani respons simulasi saat server offline / demo
     */
    handleMockFallback(action, payload) {
        return new Promise((resolve) => {
            setTimeout(() => {
                switch (action) {
                    case 'getDashboardStats':
                        resolve({ status: 'SUCCESS', data: this.calculateStatsFromState() });
                        break;
                    case 'getVoters':
                        resolve({ status: 'SUCCESS', data: state.voters.length > 0 ? state.voters : MOCK_DATA.voters });
                        break;
                    case 'getDuplicates':
                        const duplicates = (state.voters.length > 0 ? state.voters : MOCK_DATA.voters)
                            .filter(v => v.IS_DUPLICATE === 'TRUE' || v.IS_DUPLICATE === true);
                        resolve({ status: 'SUCCESS', data: duplicates });
                        break;
                    case 'getRadarWilayah':
                        resolve({ status: 'SUCCESS', data: state.radar.length > 0 ? state.radar : MOCK_DATA.radar });
                        break;
                    case 'runDeduplication':
                        resolve({ status: 'SUCCESS', message: 'Deduplikasi berhasil dijalankan (Mock Engine).' });
                        break;
                    default:
                        resolve({ status: 'SUCCESS', message: 'Aksi simulasi berhasil.' });
                }
            }, 300);
        });
    },

    /**
     * Kalkulasi statistik dari data lokal state
     */
    calculateStatsFromState() {
        const dataset = state.voters.length > 0 ? state.voters : MOCK_DATA.voters;
        let total = dataset.length;
        let dupes = dataset.filter(v => v.IS_DUPLICATE === 'TRUE' || v.IS_DUPLICATE === true).length;
        let unique = total - dupes;
        let k1 = dataset.filter(v => v.KUBU_ORIGIN === 'KUBU 1' || v.CLAIMED_BY === 'KUBU 1').length;
        let k2 = dataset.filter(v => v.KUBU_ORIGIN === 'KUBU 2' || v.CLAIMED_BY === 'KUBU 2').length;

        return {
            totalRecords: total,
            uniqueVoters: unique,
            doubleClaims: dupes,
            kubu1Count: k1,
            kubu2Count: k2,
            syncHealth: 'DEMO MOCK ACTIVE'
        };
    }
};
