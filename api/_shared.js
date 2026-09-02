function resolveApiKey(req) {
    const header = req.headers['x-elevenlabs-key'] || req.headers['X-Elevenlabs-Key'];
    if (header && String(header).trim()) {
        return String(header).trim();
    }
    return process.env.ELEVENLABS_API_KEY || '';
}

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elevenlabs-key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            if (!chunks.length) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch (error) {
                reject(new Error('Invalid JSON body.'));
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

function preflight(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return true;
    }
    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'POST only.' });
        return true;
    }
    return false;
}

async function proxyEleven(res, url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        const detail = await response.text();
        sendJson(res, response.status, {
            error: 'ElevenLabs request failed.',
            detail: detail.slice(0, 800)
        });
        return;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(bytes);
}

module.exports = {
    resolveApiKey,
    setCors,
    readJson,
    sendJson,
    preflight,
    proxyEleven
};
