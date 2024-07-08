class TabAudioProcessor {
    constructor(ffmpeg, convert_fn) {
        this.recorder = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.currentSourceNode = null;
        this.audioBuffers = [];
        this.playback = false;
        this.processing = false;

        this.convert_fn = convert_fn;

        this.FFmpeg = ffmpeg;
        this.ffmpeg = null;
        this.initFFmpeg();
    }

    async initFFmpeg() {
        this.ffmpeg = this.FFmpeg.createFFmpeg({
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

    setConvertFunction(convert_fn) {
        this.convert_fn = convert_fn;
    }

    async processAudio(blob) {
        try {
            await this.ffmpeg.FS('writeFile', 'input.wav', await this.FFmpeg.fetchFile(blob));
            this.processing = true;
            await this.ffmpeg.run('-i', 'input.wav', 'output.ogg');
            this.processing = false;
            const data = this.ffmpeg.FS('readFile', 'output.ogg');

            const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
            console.log('Processed audio retrieved.');

            // Convert the audio using the convert function
            const arrayBuffer = await this.convert_fn(blob, this.ffmpeg);

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