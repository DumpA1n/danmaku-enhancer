import esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { platforms } from './platforms.config.js';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

// 由 meta 生成 Tampermonkey 头部。数组值(@match/@grant)展开成多行。
function banner(meta) {
  const lines = ['// ==UserScript=='];
  const key = (k) => ('@' + k).padEnd(14);
  for (const [k, v] of Object.entries(meta)) {
    const vals = Array.isArray(v) ? v : [v];
    for (const val of vals) lines.push('// ' + key(k) + val);
  }
  lines.push('// ==/UserScript==', '');
  return lines.join('\n');
}

function optionsFor(p) {
  return {
    entryPoints: [p.entry],
    bundle: true,
    format: 'iife',
    target: 'es2019',
    charset: 'utf8',
    legalComments: 'none',
    banner: { js: banner(p.meta) },
    outfile: `dist/danmaku-enhancer.${p.id}.user.js`,
  };
}

if (watch) {
  for (const p of platforms) {
    const ctx = await esbuild.context(optionsFor(p));
    await ctx.watch();
  }
  console.log('watching:', platforms.map((p) => p.id).join(', '));
} else {
  await Promise.all(platforms.map((p) => esbuild.build(optionsFor(p))));
  console.log('built:', platforms.map((p) => p.id).join(', '));
}
