
class TabAudioProcessor {
    constructor() {
        this.recorder = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.currentSourceNode = null;
        this.audioBuffers = [];
        this.playback = false;
        this.processing = false;

        this.ffmpeg = null;
        this.initFFmpeg();
    }

    async initFFmpeg() {
        const { createFFmpeg } = FFmpeg;
        this.ffmpeg = createFFmpeg({
            log: false,
            logger: () => {},
            progress: () => {}
        });
        await this.ffmpeg.load();
    }

    async startRecording() {
        this.playback = true;
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } else if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            throw new Error("getDisplayMedia is not supported by your browser.");
        }

        try {
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    channels: 2,
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false,
                    sampleSize: 16
                }
            });

            const audioTracks = this.mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error("No audio track found in screen capture");
            }

            const audioStream = new MediaStream(audioTracks);
            this.recorder = new RecordRTC(audioStream, {
                type: 'audio',
                mimeType: 'audio/wav',
                recorderType: StereoAudioRecorder,
                desiredSampRate: 44100,
                timeSlice: 6000,
                ondataavailable: (blob) => this.processAudio(blob)
            });

            this.recorder.startRecording();
        } catch (error) {
            console.error("Error capturing media:", error);
            throw error;
        }
    }

    stopRecording() {
        this.playback = false;
        this.currentSourceNode = null;
        if (this.recorder) {
            this.recorder.stopRecording();
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
    }

    async processAudio(blob) {
        try {
            await this.ffmpeg.FS('writeFile', 'input.wav', await FFmpeg.fetchFile(blob));
            this.processing = true;
            await this.ffmpeg.run('-i', 'input.wav', 'output.ogg');
            this.processing = false;
            const data = this.ffmpeg.FS('readFile', 'output.ogg');

            const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
            console.log('Processed audio retrieved.');

            // Choose one of the conversion methods:
            const arrayBuffer = await this.convertAudioOnBrowser(blob);
            // const arrayBuffer = await this.convertAudioViaAPI(oggBlob);

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.push(audioBuffer);

            if (!this.currentSourceNode) {
                this.playBuffer();
            }

            if (!this.processing) {
                await this.initFFmpeg(); // Reinitialize FFmpeg
            }
        } catch (error) {
            console.error('Error during the processing', error);
        }
    }

    async convertAudioViaAPI(blob) {
        const formData = new FormData();
        formData.append('file', blob, 'audio.ogg');
        const response = await fetch('https://api.instr.io:20006/convert', {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            return response.arrayBuffer();
        } else {
            console.error("Failed to convert audio.");
            return null;
        }
    }

    async convertAudioOnBrowser(blob) {
        try {
            await this.ffmpeg.FS('writeFile', 'input.wav', await FFmpeg.fetchFile(blob));
            await this.ffmpeg.run('-i', 'input.wav', '-af', 'asetrate=44100*1.25,aresample=44100,atempo=0.8', 'output.ogg');
            const data = this.ffmpeg.FS('readFile', 'output.ogg');
            const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
            console.log('Audio pitch change successful.');
            return await oggBlob.arrayBuffer();
        } catch (error) {
            console.error('Error during audio pitch change:', error);
            return null;
        }
    }

    playBuffer() {
        if (this.audioBuffers.length > 0 && this.playback) {
            const buffer = this.audioBuffers.shift();
            const sourceNode = this.audioContext.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(this.audioContext.destination);

            const currentTime = this.audioContext.currentTime;
            sourceNode.start(currentTime);
            this.currentSourceNode = sourceNode;

            sourceNode.onended = () => {
                this.currentSourceNode = null;
                this.playBuffer();
            };
        }
    }
}

export default TabAudioProcessor;