export async function convertAudioViaAPI(blob) {
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

export async function convertAudioOnBrowser(blob) {
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