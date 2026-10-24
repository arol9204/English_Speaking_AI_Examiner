/** Records microphone audio in the browser with MediaRecorder. */
export class Recorder {
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private stream?: MediaStream;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(this.chunks));
        return;
      }
      recorder.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: recorder.mimeType }));
      };
      recorder.stop();
    });
  }
}
