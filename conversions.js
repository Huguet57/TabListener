export async function convertAudioViaAPI(blob, ffmpeg, api_url='https://api.instr.io:20006/convert') {
    const formData = new FormData();
    formData.append('file', blob, 'audio.ogg');
    const response = await fetch(api_url, {
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

export async function identity(blob, ffmpeg) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        return arrayBuffer;
    } catch (error) {
        console.error('Error during processing:', error);
        return null;
    }
}

export async function highPitch(blob, ffmpeg) {
    try {
        await ffmpeg.FS('writeFile', 'input.wav', await FFmpeg.fetchFile(blob));
        await ffmpeg.run('-i', 'input.wav', '-af', 'asetrate=44100*1.25,aresample=44100,atempo=0.8', 'output.ogg');
        const data = ffmpeg.FS('readFile', 'output.ogg');
        const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
        console.log('Audio pitch change successful.');
        return await oggBlob.arrayBuffer();
    } catch (error) {
        console.error('Error during audio pitch change:', error);
        return null;
    }
}

export async function lowFrequencies(blob, ffmpeg) {
    try {
        await ffmpeg.FS('writeFile', 'input.wav', await FFmpeg.fetchFile(blob));
        await ffmpeg.run('-i', 'input.wav', '-af', 'lowpass=f=300', 'output.ogg');
        const data = ffmpeg.FS('readFile', 'output.ogg');
        const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
        console.log('Low frequencies filter applied successfully.');
        return await oggBlob.arrayBuffer();
    } catch (error) {
        console.error('Error during low frequencies filter:', error);
        return null;
    }
}
