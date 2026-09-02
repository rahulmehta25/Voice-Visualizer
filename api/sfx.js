const { resolveApiKey, readJson, sendJson, preflight, proxyEleven, setCors } = require('./_shared');

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

    const text = String(body.text || 'cinematic whoosh then a heavy theatrical impact').trim();
    const durationSeconds = Math.min(8, Math.max(0.5, Number(body.durationSeconds) || 1.6));

    await proxyEleven(res, 'https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
            'xi-api-key': key
        },
        body: JSON.stringify({
            text,
            duration_seconds: durationSeconds,
            prompt_influence: 0.45,
            model_id: 'eleven_text_to_sound_v2'
        })
    });
};
