import _ from 'lodash';
import path from 'path';
import grpc from 'grpc';
import B from 'bluebird';
import npmlog from "npmlog";
import { getMatchingElements } from './lib/classifier';
import { canvasFromImage } from './lib/image';
import { asyncmap } from 'asyncbox';

const PROTO = path.resolve(__dirname, '..', 'proto', 'classifier.proto');

const DEF_HOST = "localhost";
const DEF_PORT = 50051;
const DEF_CONFIDENCE = 0.2;

const QUERY = "//body//*[not(self::script) and not(self::style) and not(child::*)]";


const log = new Proxy({}, {
  get (target, name) {
    return function (...args) {
      npmlog[name]('ai-rpc', ...args);
    };
  }
});

class ClassifierClient {
  constructor ({host = DEF_HOST, port = DEF_PORT}) {
    this.host = host;
    this.port = port;
    const protoLoader = require('@grpc/proto-loader');
    const packageDef = protoLoader.loadSync(PROTO, {
      keepCase: true,
      defaults: true,
      oneofs: true
    });
    const protoDesc = grpc.loadPackageDefinition(packageDef);
    const client = new protoDesc.Classifier(`${this.host}:${this.port}`, grpc.credentials.createInsecure());
    this._classifyElements = B.promisify(client.classifyElements, {context: client});
  }

  async classifyElements ({
    labelHint,
    elementImages,
    confidenceThreshold = DEF_CONFIDENCE,
    allowWeakerMatches = false
  }) {
    const classifications = {};
    try {
      // TODO implementation
      const elsAndImages = await asyncmap(_.keys(elementImages), async (k) => {
        return [k, await canvasFromImage(elementImages[k])];
      });
      const matchingEls = await getMatchingElements({
        elsAndImages,
        label: labelHint,
        confidence: confidenceThreshold,
        allowWeakerMatches,
        logger: log,
        returnMetadata: true
      });
      for (const [elId, label, confidenceForHint, confidence] of matchingEls) {
        classifications[elId] = {label, confidenceForHint, confidence};
      }
    } catch (err) {
      return console.error(err);
    }
    // const res = await this._classifyElements({labelHint, elementImages, confidenceThreshold, allowWeakerMatches});
    return classifications;
  }

  async findElementsMatchingLabel ({
    driver,
    labelHint,
    confidenceThreshold = DEF_CONFIDENCE,
    allowWeakerMatches = false
  }) {
    const els = await driver.$$(QUERY);
    const elementImages = {};
    for (const el of els) {
      try {
        const b64Screen = await el.takeElementScreenshot(el.elementId);
        elementImages[el.elementId] = Buffer.from(b64Screen, 'base64');

        // eslint-disable-next-line promise/prefer-await-to-callbacks
        // fs.writeFile(`${el.elementId}.png`, b64Screen, 'base64', function(err) {
        //   console.log(err);
        // });
      } catch (ign) {}
    }
    if (_.size(elementImages) < 1) {
      throw new Error('Could not find any screenshots for leaf node elements');
    }
    const matched = await this.classifyElements({
      labelHint,
      elementImages,
      confidenceThreshold,
      allowWeakerMatches,
    });

    // return only those elements whose ids ended up in our matched list
    // console.log(matched);
    // console.log(els);
    return els.filter(el => _.includes(_.keys(matched), el.elementId));
  }
}

export default ClassifierClient;
export { ClassifierClient };
