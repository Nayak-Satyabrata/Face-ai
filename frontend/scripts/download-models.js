/**
 * download-models.js
 *
 * Downloads the face-api.js pre-trained model files into public/models/.
 * Run this ONCE before starting the frontend:
 *   node scripts/download-models.js
 *
 * Models are fetched from the official face-api.js-models GitHub repository.
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const BASE_URL  = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const OUT_DIR   = path.join(__dirname, '..', 'public', 'models');

// All model files required for ssdMobilenetv1 + faceLandmark68Net + faceRecognitionNet
const MODEL_FILES = [
  // SSD Mobilenet V1 (face detector)
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  // Face Landmark 68 Net
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  // Face Recognition Net
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  ✓ Skip (exists): ${path.basename(dest)}`);
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      // Handle redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUT_DIR}`);
  }

  console.log(`\nDownloading ${MODEL_FILES.length} model files to public/models/ ...\n`);

  for (const file of MODEL_FILES) {
    const url  = `${BASE_URL}/${file}`;
    const dest = path.join(OUT_DIR, file);
    process.stdout.write(`  ↓ ${file} ... `);
    try {
      await download(url, dest);
      console.log('done');
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }

  console.log('\n✅  All models downloaded! You can now run: npm run dev\n');
}

main();
