import React from 'react';
import scribe from 'scribe.js-ocr/scribe.js';

export async function processVideoFile(file) {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const fileURL = URL.createObjectURL(file);
      video.src = fileURL;

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const fps = 15; // Extract one frame per second
        const totalFrames = Math.floor(duration * fps);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const extractedTexts = [];

        for (let i = 0; i < totalFrames; i++) {
          const currentTime = i / fps;
          video.currentTime = currentTime;

          await new Promise((res) => {
            video.onseeked = async () => {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataURL = canvas.toDataURL('image/png');

              // Convert Data URL to Blob
              const response = await fetch(dataURL);
              const blob = await response.blob();
              const imageFile = new File([blob], `frame_${i}.png`, { type: 'image/png' });

              // Perform OCR on the frame
              await scribe.init({ ocr: true, font: true });
              const text = await scribe.extractText([imageFile]);
              extractedTexts.push(text);

              res();
            };
          });
        }

        URL.revokeObjectURL(fileURL);
        const fullText = extractedTexts.join(' ');
        resolve(fullText);
      };

      video.onerror = () => {
        reject(new Error('Error loading video file.'));
      };
    } catch (error) {
      reject(error);
    }
  });
}