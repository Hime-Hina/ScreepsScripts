export class ScreepsServerOutput {
  constructor() {
    this.logText = '';
  }

  write(chunk) {
    const chunkText = String(chunk);
    this.logText += chunkText;
    process.stdout.write(chunkText);
  }
}
