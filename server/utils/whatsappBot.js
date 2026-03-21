/**
 * server/utils/whatsappBot.js
 *
 * Free WhatsApp bot using @whiskeysockets/baileys — NO Chrome needed.
 * Session saved in .whatsapp-session/ — scan QR once, works forever.
 *
 * Admin replies:
 *   OUI [ID]  → approve leave request
 *   NON [ID]  → reject leave request
 *   (ID = last 6 chars of MongoDB _id, shown in the notification message)
 */

import LeaveRequest from '../models/LeaveRequest.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Bot is connected as +216 56 129 196
// Admin who receives notifications and can reply OUI/NON
const ADMIN_PHONE = '21656129196@s.whatsapp.net';
const ADMIN_BARE = '21656129196';

let sock = null;
let isReady = false;
let msgQueue = [];

// Short readable ID from a MongoDB ObjectId (last 6 hex chars, uppercase)
const shortId = id => id.toString().slice(-6).toUpperCase();

// ─── Outgoing message ────────────────────────────────────────────────────────
export const sendWhatsAppMessage = async (text) => {
    if (!sock || !isReady) {
        msgQueue.push(text);
        return;
    }
    try {
        await sock.sendMessage(ADMIN_PHONE, { text });
    } catch (err) {
        console.error('❌ WhatsApp send error:', err.message);
    }
};

// ─── Leave notification (includes OUI/NON instructions) ─────────────────────
export const sendLeaveNotification = async (leave, username) => {
    const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
    const sid = shortId(leave._id);

    const msg = [
        `🏖️ *Nouvelle demande de congé*  [ID: ${sid}]`,
        `👤 Délégué : *${username}*`,
        `📅 Du : ${fmt(leave.startDate)}`,
        `📅 Au : ${fmt(leave.endDate)}  (${days} jour(s))`,
        `📝 Motif : ${leave.reason}`,
        ``,
        `Répondez :`,
        `  ✅ *OUI ${sid}*  → Approuver`,
        `  ❌ *NON ${sid}*  → Refuser`,
    ].join('\n');

    await sendWhatsAppMessage(msg);
};

// ─── Handle incoming message from admin ─────────────────────────────────────
const handleAdminReply = async (text) => {
    const upper = text.trim().toUpperCase();

    // Accept "OUI", "OUI A3F9C2", "NON", "NON A3F9C2"
    const match = upper.match(/^(OUI|NON)\s*([A-F0-9]{6})?$/);
    if (!match) return;

    const action = match[1];          // 'OUI' or 'NON'
    const sid = match[2] || null;  // 6-char short ID or null

    let leave = null;

    try {
        if (sid) {
            // Find pending leave whose _id ends with this short code
            const pending = await LeaveRequest.find({ status: 'pending' }).populate('user', 'username');
            leave = pending.find(l => shortId(l._id) === sid) || null;

            if (!leave) {
                // Maybe already treated — check all
                const all = await LeaveRequest.find().populate('user', 'username');
                const found = all.find(l => shortId(l._id) === sid);
                if (found) {
                    await sendWhatsAppMessage(`ℹ️ La demande ${sid} a déjà été traitée (${found.status}).`);
                } else {
                    await sendWhatsAppMessage(`⚠️ Aucune demande trouvée avec l'ID *${sid}*.\nVérifiez et réessayez.`);
                }
                return;
            }
        } else {
            // No ID given → use the most recent pending request
            leave = await LeaveRequest.findOne({ status: 'pending' })
                .populate('user', 'username')
                .sort({ createdAt: -1 });

            if (!leave) {
                await sendWhatsAppMessage(`ℹ️ Aucune demande en attente.`);
                return;
            }
        }

        // Update status
        leave.status = action === 'OUI' ? 'approved' : 'rejected';
        leave.reviewedAt = new Date();
        await leave.save();

        const icon = action === 'OUI' ? '✅' : '❌';
        const label = action === 'OUI' ? 'Approuvée' : 'Refusée';
        const name = leave.user?.username || leave.user?.toString() || '?';

        await sendWhatsAppMessage(`${icon} *${label}* — Congé de *${name}* mis à jour avec succès.`);
        console.log(`[WhatsApp] Leave ${leave._id} → ${leave.status} via WhatsApp`);

    } catch (err) {
        console.error('[WhatsApp] Reply processing error:', err.message);
        await sendWhatsAppMessage(`❌ Erreur : ${err.message}`);
    }
};

// ─── Init ────────────────────────────────────────────────────────────────────
export const initWhatsAppBot = async () => {
    if (sock) return;
    try {
        const {
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            fetchLatestBaileysVersion
        } = await import('@whiskeysockets/baileys');

        // Inline silent logger — removes pino dependency
        const qrcode = require('qrcode-terminal');

        const { state, saveCreds } = await useMultiFileAuthState('.whatsapp-session');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: { level: 'silent', trace: () => { }, debug: () => { }, info: () => { }, warn: () => { }, error: () => { }, fatal: () => { }, child: function () { return this; } },
            printQRInTerminal: true,
        });

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log('\n📱 WHATSAPP BOT — Scannez ce QR code avec +216 92 568 518 :');
                console.log('(WhatsApp → ⋮ → Appareils connectés → Connecter un appareil)\n');
                qrcode.generate(qr, { small: true });
            }
            if (connection === 'close') {
                const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                isReady = false; sock = null;
                if (reconnect) setTimeout(initWhatsAppBot, 5000);
            }
            if (connection === 'open') {
                console.log('✅ WhatsApp Bot connecté ! Répondez OUI/NON [ID] pour traiter les congés.');
                isReady = true;
                for (const m of msgQueue) await sendWhatsAppMessage(m);
                msgQueue = [];
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Listen for ALL messages — OUI/NON commands work regardless of device/JID type
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            for (const msg of messages) {
                const jid = msg.key.remoteJid || '';
                const fromMe = msg.key.fromMe;

                // Extract text from all possible locations
                const text =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    '';

                if (!text) continue;

                console.log(`[WhatsApp] msg jid=${jid} fromMe=${fromMe} text="${text.slice(0, 60)}"`);

                // Echo TEST command (to confirm bot is alive)
                if (text.trim().toUpperCase() === 'TEST') {
                    await sendWhatsAppMessage('🤖 Bot en ligne ! Envoyez *OUI [ID]* ou *NON [ID]*.');
                    continue;
                }

                // Only process OUI/NON — skip the bot's own outgoing leave notifications
                // (they start with 🏖, not OUI/NON, so the regex handles it automatically)
                const upper = text.trim().toUpperCase();
                if (/^(OUI|NON)/.test(upper)) {
                    await handleAdminReply(text);
                }
            }
        });

    } catch (err) {
        console.error('❌ WhatsApp Bot init error:', err.message);
    }
};
