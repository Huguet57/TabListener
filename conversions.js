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

export async function changePitchAndFrequency(blob, ffmpeg, pitchAmount, frequency) {
    try {
        await ffmpeg.FS('writeFile', 'input.wav', await FFmpeg.fetchFile(blob));
        await ffmpeg.run('-i', 'input.wav', '-af', `asetrate=44100*${pitchAmount},aresample=44100,atempo=${1/pitchAmount},lowpass=f=${frequency}`, 'output.ogg');
        const data = ffmpeg.FS('readFile', 'output.ogg');
        const oggBlob = new Blob([data.buffer], { type: 'audio/ogg' });
        console.log('Audio pitch and frequency change successful.');
        return await oggBlob.arrayBuffer();
    } catch (error) {
        console.error('Error during audio pitch and frequency change:', error);
        return null;
    }
}