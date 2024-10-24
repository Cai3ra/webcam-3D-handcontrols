export class MediaPipeHands {
  constructor(videoElement, onResultsCallback) {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResultsCallback);

    this.camera = new Camera(videoElement, {
      async onFrame() {
        await hands.send({ image: videoElement });
      },
      width: this.isMobile() ? 720 : 1280,
      height: this.isMobile() ? 1280 : 720,
    });
  }

  isMobile() {
    return window.innerWidth < window.innerHeight;
  }

  start() {
    if (this.camera) this.camera.start();
  }
}
