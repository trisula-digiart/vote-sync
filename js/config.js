/**
 * VOTE-SYNC CYBER CORE - CONFIG & STATE MANAGEMENT
 * File: js/config.js
 * Description: Menyimpan konfigurasi global, state aplikasi, dan data demo mock.
 */

const CONFIG = {
    STORAGE_KEY_GAS_URL: 'VOTE_SYNC_GAS_URL',
    STORAGE_KEY_TOKEN: 'VOTE_SYNC_AUTH_TOKEN'
};

// Global Application State Singleton
const state = {
    currentUser: {
        username: 'admin',
        role: 'SUPER_ADMIN',
        fullName: 'Cyber Admin'
    },
    // URL Web App GAS Endpoint Backend
    gasApiUrl: localStorage.getItem(CONFIG.STORAGE_KEY_GAS_URL) || 'https://script.google.com/macros/s/AKfycbxBxlyyICvIrVoX0cbgXwhsgomn_atsGZFZnMmHr4WjNNaR8fWIkomzzU4G1lC-cw/exec',
    token: localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN) || '',
    connectionStatus: 'DISCONNECTED', // Status: 'CONNECTED' | 'DISCONNECTED' | 'DEMO'
    latencyMs: 0,                     // Measured Latency in milliseconds
    wasOffline: false,                // State flag for auto-resync
    voters: [],
    duplicates: [],
    radar: [],
    logs: [],
    stats: {
        totalRecords: 0,
        uniqueVoters: 0,
        doubleClaims: 0,
        kubu1Count: 0,
        kubu2Count: 0,
        syncHealth: 'DEMO MOCK ACTIVE'
    }
};

// Default Fallback Datasets for Demo Mock Mode
const MOCK_DATA = {
    voters: [
        { NIK: '3171012003850001', NAMA: 'BUDI SANTOSO', RT: '001', RW: '002', KUBU_ORIGIN: 'KUBU 1', CLAIMED_BY: 'BOTH (KUBU 1 & 2)', IS_DUPLICATE: 'TRUE', CONFIDENCE_SCORE: 100 },
        { NIK: '3171012003850001', NAMA: 'BUDI SANTOSO', RT: '001', RW: '002', KUBU_ORIGIN: 'KUBU 2', CLAIMED_BY: 'BOTH (KUBU 1 & 2)', IS_DUPLICATE: 'TRUE', CONFIDENCE_SCORE: 100 },
        { NIK: '3171015508920003', NAMA: 'SITI AMINAH', RT: '001', RW: '002', KUBU_ORIGIN: 'KUBU 1', CLAIMED_BY: 'KUBU 1', IS_DUPLICATE: 'FALSE', CONFIDENCE_SCORE: 100 },
        { NIK: '3171011102780005', NAMA: 'AHMAD HIDAYAT', RT: '003', RW: '002', KUBU_ORIGIN: 'KUBU 2', CLAIMED_BY: 'KUBU 2', IS_DUPLICATE: 'FALSE', CONFIDENCE_SCORE: 100 },
        { NIK: '3171014409900007', NAMA: 'EKO PRASETYO', RT: '003', RW: '002', KUBU_ORIGIN: 'KUBU 1', CLAIMED_BY: 'BOTH (KUBU 1 & 2)', IS_DUPLICATE: 'TRUE', CONFIDENCE_SCORE: 100 },
        { NIK: '3171016612880009', NAMA: 'DEWI LESTARI', RT: '002', RW: '001', KUBU_ORIGIN: 'KUBU 1', CLAIMED_BY: 'KUBU 1', IS_DUPLICATE: 'FALSE', CONFIDENCE_SCORE: 100 }
    ],
    radar: [
        { rt: '001', rw: '002', total: 3, duplicates: 1, anomalyPercentage: 33 },
        { rt: '003', rw: '002', total: 2, duplicates: 1, anomalyPercentage: 50 },
        { rt: '002', rw: '001', total: 1, duplicates: 0, anomalyPercentage: 0 }
    ]
};
