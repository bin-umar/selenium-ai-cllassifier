import path from 'path';

// need to initialize tfjs before calling the classifier bindings, otherwise it
// cannot find the tf c lib
import '@tensorflow/tfjs-node';
import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

const { TF_VERSION, detect: _detect } = require('bindings')('./test-ai-classifier');
const TF_MODEL = path.resolve(__dirname, "..", "..", "model", "model.json");

const MODEL = path.resolve(__dirname, "..", "..", "model", "obj_detection_model");

async function detect (imgPath, confidence = 0.95, debug = false) {
  const model = await loadGraphModel(`file://${TF_MODEL}`);
  const tfImg = tf.browser.fromPixels(imgPath);
  const smallImg = tf.image.resizeBilinear(tfImg, [300, 300]); // 600, 450
  const resized = tf.cast(smallImg, 'float32');
  const tf4d = tf.tensor4d(Array.from(resized.dataSync()), [-1, 224, 224, 3]); // 600, 450
  console.log('tf4d', tf4d);
  let predictions = await model.executeAsync({ Placeholder: tf4d }, ['detection_boxes', 'num_detections', 'detection_classes', 'detection_scores']);
  console.log('predictions', predictions);
  return _detect(MODEL, imgPath, confidence, debug);
}

export { TF_VERSION, detect };
