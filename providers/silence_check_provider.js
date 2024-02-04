const threshold = 0.01;


const silence_check = (rawarray) => {
    try{
        // Concatenate the audio data buffers into a single buffer
        const audioBuffer = Buffer.concat(rawarray);
        
        // Convert the audio buffer to an array of 16-bit signed integers (Int16Array)
        const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
        
        // Process the audio data to calculate the RMS amplitude (energy)
        let sumOfSquares = 0;
        for (const sample of int16Array) {
            const normalizedSample = sample / 32767; // Normalize to the range [-1, 1]
            sumOfSquares += normalizedSample * normalizedSample;
        }
        // Calculate the energy as the RMS amplitude
        const energy = Math.sqrt(sumOfSquares / int16Array.length);
        
        // Compare the energy with the silence threshold
        return energy < threshold;
    }catch(err){
        console.log("Error in detecting Silence  :  "+err);
    }
}

const threshold2 = 0.009;



const silence_check2 = (rawarray) => {
    try{
    // Concatenate the audio data buffers into a single buffer
    const audioBuffer = Buffer.concat(rawarray);

    // Convert the audio buffer to an array of 16-bit signed integers (Int16Array)
    const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);

    // Process the audio data to calculate the RMS amplitude (energy)
    let sumOfSquares = 0;
    for (const sample of int16Array) {
        const normalizedSample = sample / 32767; // Normalize to the range [-1, 1]
        sumOfSquares += normalizedSample * normalizedSample;
    }
    // Calculate the energy as the RMS amplitude
    const energy = Math.sqrt(sumOfSquares / int16Array.length);

    // Compare the energy with the silence threshold
    return energy < threshold2;
}catch(err){
    console.log("Error in detecting Silence  :  "+err);
}
}



module.exports = {silence_check , silence_check2};