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

    const text = String(body.text || '').trim();
    if (!text) {
        sendJson(res, 400, { error: 'text is required.' });
        return;
    }

    const voiceId = String(body.voiceId || DEFAULT_VOICE).trim() || DEFAULT_VOICE;

    await proxyEleven(
        res,
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
                'xi-api-key': key
            },
            body: JSON.stringify({
                text: text.slice(0, 2500),
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.38,
                    similarity_boost: 0.82,
                    style: 0.42,
                    use_speaker_boost: true
                }
            })
        }
    );
};
