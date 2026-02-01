/**
 * Recorder - Voice Visualizer
 * Handles video recording and screenshot capture
 */

class Recorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.startTime = 0;
        this.timerInterval = null;
        
        // Callbacks
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onTimeUpdate = null;
    }
    
    async startRecording() {
        try {
            // Get canvas stream
            const canvasStream = this.canvas.captureStream(60); // 60 FPS
            
            // Try to get audio stream too
            let combinedStream;
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTracks = audioStream.getAudioTracks();
                combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioTracks
                ]);
            } catch (e) {
                // No audio, just use canvas stream
                console.log('Recording without audio');
                combinedStream = canvasStream;
            }
            
            // Create media recorder
            const options = { mimeType: 'video/webm;codecs=vp9' };
            
            // Fallback for browsers that don't support vp9
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.startTime = Date.now();
            
            // Start timer
            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                if (this.onTimeUpdate) {
                    this.onTimeUpdate(this.formatTime(elapsed));
                }
            }, 1000);
            
            if (this.onRecordingStart) {
                this.onRecordingStart();
            }
            
            console.log('🔴 Recording started');
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            clearInterval(this.timerInterval);
            
            if (this.onRecordingStop) {
                this.onRecordingStop();
            }
            
            console.log('⏹️ Recording stopped');
        }
    }
    
    saveRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-visualizer-${this.getTimestamp()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
        
        console.log('💾 Recording saved');
    }
    
    takeScreenshot() {
        try {
            // Create a temporary canvas to capture the current frame
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0);
            
            // Convert to PNG and download
            const dataUrl = tempCanvas.toDataURL('image/png');
            
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `voice-visualizer-${this.getTimestamp()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            console.log('📷 Screenshot saved');
            return true;
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            return false;
        }
    }
    
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    }
}

// Export
window.Recorder = Recorder;
