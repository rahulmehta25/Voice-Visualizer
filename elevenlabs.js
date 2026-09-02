/**
 * ElevenLabs client and Signal Theatre scene catalog.
 * Live calls go through /api/* so the key never ships in the page.
 */

const ELEVEN_DEFAULT_VOICE = '9BYzVcM9pJCYJmEU4drb';
const ELEVEN_KEY_STORAGE = 'signalTheatre.elevenKey';

const SCENE_LIBRARY = [
    {
        id: 'monologue',
        name: 'Monologue',
        file: 'samples/monologue.mp3',
        mode: 'waveform',
        logline: 'A single voice holds the room.'
    },
    {
        id: 'whisper',
        name: 'Whisper',
        file: 'samples/whisper.mp3',
        mode: 'cloud',
        logline: 'Almost nothing. Then breath.'
    },
    {
        id: 'pulse',
        name: 'Pulse',
        file: 'samples/pulse.mp3',
        mode: 'radial',
        logline: 'A heartbeat finds the floor.'
    },
    {
        id: 'crescendo',
        name: 'Crescendo',
        file: 'samples/crescendo.mp3',
        mode: 'aurora',
        logline: 'The last note climbs and stays.'
    },
    {
        id: 'whoosh-impact',
        name: 'Whoosh Impact',
        file: 'samples/whoosh-impact.mp3',
        mode: 'radial',
        logline: 'Air, then the hit.',
        sfx: true
    }
];

const CAST_VOICES = [
    { id: ELEVEN_DEFAULT_VOICE, name: 'Rahul', role: 'House voice' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', role: 'Warm lead' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', role: 'Low register' },
    { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', role: 'Grit' }
];

const HOUSE_LINE = 'The house goes dark. Then one voice finds the light and refuses to leave.';

class ElevenLabsClient {
    constructor() {
        this.defaultVoiceId = ELEVEN_DEFAULT_VOICE;
    }

    getSessionKey() {
        try {
            return (sessionStorage.getItem(ELEVEN_KEY_STORAGE) || '').trim();
        } catch (error) {
            return '';
        }
    }

    setSessionKey(value) {
        const next = String(value || '').trim();
        try {
            if (next) {
                sessionStorage.setItem(ELEVEN_KEY_STORAGE, next);
            } else {
                sessionStorage.removeItem(ELEVEN_KEY_STORAGE);
            }
        } catch (error) {
            console.warn('Unable to store session key:', error);
        }
    }

    headers(extra = {}) {
        const headers = { ...extra };
        const key = this.getSessionKey();
        if (key) {
            headers['x-elevenlabs-key'] = key;
        }
        return headers;
    }

    async readError(response) {
        const text = await response.text();
        try {
            const parsed = JSON.parse(text);
            return parsed.error || parsed.detail || parsed.message || text || `HTTP ${response.status}`;
        } catch (error) {
            return text || `HTTP ${response.status}`;
        }
    }

    async requestAudio(url, options) {
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = new Error(await this.readError(response));
            error.status = response.status;
            throw error;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
            const detail = await this.readError(response);
            const error = new Error(detail || 'Unexpected JSON response from audio endpoint.');
            error.status = response.status;
            throw error;
        }

        const blob = await response.blob();
        if (!blob || !blob.size) {
            const error = new Error('Audio endpoint returned an empty body.');
            error.status = response.status;
            throw error;
        }
        return blob;
    }

    async speakDirect(text, voiceId) {
        const key = this.getSessionKey();
        if (!key) {
            throw new Error('Add a session key, or set ELEVENLABS_API_KEY on the server.');
        }

        return this.requestAudio(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
                'xi-api-key': key
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.38,
                    similarity_boost: 0.82,
                    style: 0.42,
                    use_speaker_boost: true
                }
            })
        });
    }

    async morphDirect(blob, voiceId) {
        const key = this.getSessionKey();
        if (!key) {
            throw new Error('Add a session key, or set ELEVENLABS_API_KEY on the server.');
        }

        const form = new FormData();
        form.append('audio', blob, 'cue.webm');
        form.append('model_id', 'eleven_multilingual_sts_v2');

        return this.requestAudio(`https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                Accept: 'audio/mpeg',
                'xi-api-key': key
            },
            body: form
        });
    }

    async speak(text, voiceId = this.defaultVoiceId) {
        const line = String(text || '').trim();
        if (!line) {
            throw new Error('Write a line for the house voice.');
        }

        try {
            return await this.requestAudio('/api/tts', {
                method: 'POST',
                headers: this.headers({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ text: line, voiceId })
            });
        } catch (error) {
            if (error.status === 404 || error.status === 405 || error.message.includes('Failed to fetch')) {
                return this.speakDirect(line, voiceId);
            }
            throw error;
        }
    }

    async morph(blob, voiceId = this.defaultVoiceId) {
        if (!blob || !blob.size) {
            throw new Error('Record a short line before morphing.');
        }

        const audioBase64 = await this.blobToBase64(blob);

        try {
            return await this.requestAudio('/api/morph', {
                method: 'POST',
                headers: this.headers({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    voiceId,
                    audioBase64,
                    mimeType: blob.type || 'audio/webm'
                })
            });
        } catch (error) {
            if (error.status === 404 || error.status === 405 || error.message.includes('Failed to fetch')) {
                return this.morphDirect(blob, voiceId);
            }
            throw error;
        }
    }

    async generateSfx(text = 'cinematic whoosh then a heavy theatrical impact', durationSeconds = 1.6) {
        try {
            return await this.requestAudio('/api/sfx', {
                method: 'POST',
                headers: this.headers({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ text, durationSeconds })
            });
        } catch (error) {
            if (error.status === 404 || error.status === 405 || error.message.includes('Failed to fetch')) {
                const key = this.getSessionKey();
                if (!key) {
                    throw error;
                }
                return this.requestAudio('https://api.elevenlabs.io/v1/sound-generation', {
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
            }
            throw error;
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(new Error('Unable to read the recorded clip.'));
            reader.readAsDataURL(blob);
        });
    }

    sceneById(id) {
        return SCENE_LIBRARY.find((scene) => scene.id === id) || null;
    }

    fallbackSceneForSpeak(text) {
        const line = String(text || '').toLowerCase();
        if (line.length < 40 || /whisper|quiet|soft|hush/.test(line)) {
            return this.sceneById('whisper');
        }
        if (/rise|build|crescendo|climb/.test(line)) {
            return this.sceneById('crescendo');
        }
        return this.sceneById('monologue');
    }
}

window.ELEVEN_DEFAULT_VOICE = ELEVEN_DEFAULT_VOICE;
window.SCENE_LIBRARY = SCENE_LIBRARY;
window.CAST_VOICES = CAST_VOICES;
window.HOUSE_LINE = HOUSE_LINE;
window.ElevenLabsClient = ElevenLabsClient;
