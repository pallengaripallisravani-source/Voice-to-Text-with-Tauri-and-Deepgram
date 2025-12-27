const DEEPGRAM_API_KEY = "PASTE_YOUR_DEEPGRAM_API_KEY";

let socket;
let processor;
let stream;

const button = document.getElementById("record");
const output = document.getElementById("output");

button.onmousedown = startRecording;
button.onmouseup = stopRecording;

async function startRecording() {
  output.value = "";

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);

  processor = audioContext.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioContext.destination);

  socket = new WebSocket(
    "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000",
    ["token", DEEPGRAM_API_KEY]
  );

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const transcript = data.channel?.alternatives[0]?.transcript;
    if (transcript) {
      output.value += transcript + " ";
    }
  };

  processor.onaudioprocess = (event) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(convertTo16BitPCM(event.inputBuffer.getChannelData(0)));
    }
  };
}

function stopRecording() {
  processor?.disconnect();
  stream?.getTracks().forEach((t) => t.stop());
  socket?.close();
}

function convertTo16BitPCM(input) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < input.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}
