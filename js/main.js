// Variables de conteo acumulado
let eyeCount = 0;
let browCount = 0;
let mouthCount = 0;

// Estado actual por frame
let eyeDetected = false;
let browDetected = false;
let mouthDetected = false;

// Capturar cámara
const video = document.getElementById("videoInput");
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => { video.srcObject = stream; })
  .catch(err => console.error("Error con la cámara:", err));

// Clase Utils para cargar XML
class Utils {
  constructor(errorOutputId) {
    this.createFileFromUrl = this.createFileFromUrl.bind(this);
    this.errorOutput = document.getElementById(errorOutputId) || console;
  }
  
  createFileFromUrl(path, url, callback) {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {
      if (request.status === 200) {
        let data = new Uint8Array(request.response);
        cv.FS_createDataFile('/', path, data, true, false, false);
        callback();
      } else {
        this.errorOutput.innerHTML = `Failed to load ${url} status=${request.status}`;
      }
    };
    request.send();
  }
}

// Inicializar OpenCV
cv['onRuntimeInitialized'] = () => {
  console.log("✅ OpenCV.js cargado correctamente");

  let cap = new cv.VideoCapture(video);
  let canvas = document.getElementById("canvasOutput");
  let ctx = canvas.getContext("2d", { willReadFrequently: true });
  let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  let gray = new cv.Mat();

  // Cargar clasificadores
  let faceCascade = new cv.CascadeClassifier();
  let eyeCascade = new cv.CascadeClassifier();
  let smileCascade = new cv.CascadeClassifier(); // boca aproximada
  let utils = new Utils('errorMessage');

  utils.createFileFromUrl('haarcascade_frontalface_default.xml', 'data/haarcascade_frontalface_default.xml', () => {
    faceCascade.load('haarcascade_frontalface_default.xml');
    utils.createFileFromUrl('haarcascade_eye.xml', 'data/haarcascade_eye.xml', () => {
      eyeCascade.load('haarcascade_eye.xml');
      utils.createFileFromUrl('haarcascade_smile.xml', 'data/haarcascade_smile.xml', () => {
        smileCascade.load('haarcascade_smile.xml');
        requestAnimationFrame(processVideo);
      });
    });
  });

  function processVideo() {
    cap.read(frame);
    cv.flip(frame, frame, 1);
    cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY, 0);

    let faces = new cv.RectVector();
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0);

    // Reset estado actual
    eyeDetected = false;
    browDetected = false;
    mouthDetected = false;

    for (let i = 0; i < faces.size(); i++) {
      let face = faces.get(i);
      cv.rectangle(frame, new cv.Point(face.x, face.y), new cv.Point(face.x + face.width, face.y + face.height), [255, 0, 0, 255], 2);

      let roiGray = gray.roi(face);
      let roiColor = frame.roi(face);

      // Ojos
      let eyes = new cv.RectVector();
      eyeCascade.detectMultiScale(roiGray, eyes, 1.1, 3, 0);
      if (eyes.size() > 0) eyeDetected = true;
      for (let j = 0; j < eyes.size(); j++) {
        let eye = eyes.get(j);
        cv.rectangle(roiColor, new cv.Point(eye.x, eye.y), new cv.Point(eye.x + eye.width, eye.y + eye.height), [0, 255, 0, 255], 2);
        eyeCount++;
        // Cejas
        let browY = Math.max(eye.y - Math.round(eye.height / 2), 0);
        cv.rectangle(roiColor, new cv.Point(eye.x, browY), new cv.Point(eye.x + eye.width, eye.y), [255, 255, 0, 255], 2);
        browDetected = true;
        browCount++;
      }

      // Boca (Smile)
      let smiles = new cv.RectVector();
      smileCascade.detectMultiScale(roiGray, smiles, 1.7, 22, 0);
      if (smiles.size() > 0) mouthDetected = true;
      for (let k = 0; k < smiles.size(); k++) {
        let smile = smiles.get(k);
        cv.rectangle(roiColor, new cv.Point(smile.x, smile.y), new cv.Point(smile.x + smile.width, smile.y + smile.height), [255, 0, 255, 255], 2);
        mouthCount++;
      }

      roiGray.delete();
      roiColor.delete();
      eyes.delete();
      smiles.delete();
    }

    // Actualizar card
    document.getElementById("eyeCount").innerText = eyeCount;
    document.getElementById("browCount").innerText = browCount;
    document.getElementById("mouthCount").innerText = mouthCount;

    document.getElementById("eyeStatus").innerText = eyeDetected ? "✅" : "❌";
    document.getElementById("browStatus").innerText = browDetected ? "✅" : "❌";
    document.getElementById("mouthStatus").innerText = mouthDetected ? "✅" : "❌";

    cv.imshow('canvasOutput', frame);
    faces.delete();
    requestAnimationFrame(processVideo);
  }
};


fetch("data/programmer.json")
  .then(res => res.json())
  .then(data => {
    document.getElementById("programmerInfo").innerHTML = 
      `👨‍💻 ${data.name} | 📧 ${data.email} | <a href="${data.github}" target="_blank">GitHub</a>`;
  })
  .catch(err => console.error("Error cargando datos:", err));