const { resolveApiKey, readJson, sendJson, preflight, proxyEleven, setCors } = require('./_shared');

const DEFAULT_VOICE = '9BYzVcM9pJCYJmEU4drb';

module.exports = async function handler(req, res) {
    setCors(res);
    if (preflight(req, res)) {
        return;
    }

    const key = resolveApiKey(req);
    if (!key) {
        sendJson(res, 503, {
            error: 'Missing ELEVENLABS_API_KEY. Set it on Vercel, or send x-elevenlabs-key for this session.'
        });
        return;
    }

    let body;
    try {
        body = await readJson(req);
    } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
    }

    const audioBase64 = String(body.audioBase64 || '').trim();
    if (!audioBase64) {
        sendJson(res, 400, { error: 'audioBase64 is required.' });
        return;
    }

    const voiceId = String(body.voiceId || DEFAULT_VOICE).trim() || DEFAULT_VOICE;
    const mimeType = String(body.mimeType || 'audio/webm');
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const form = new FormData();
    form.append('audio', new Blob([audioBuffer], { type: mimeType }), 'cue.webm');
    form.append('model_id', 'eleven_multilingual_sts_v2');

    await proxyEleven(
        res,
        `https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(voiceId)}`,
        {
            method: 'POST',
            headers: {
                Accept: 'audio/mpeg',
                'xi-api-key': key
            },
            body: form
        }
    );
};
