import { createEngine } from '../core/index.js';
import { huya } from '../platforms/huya.js';

if (huya.match()) {
  createEngine(huya).start();
}
