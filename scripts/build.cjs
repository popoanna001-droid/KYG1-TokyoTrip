const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const data = vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8') + ';data');
new vm.Script(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
for (const trip of data) for (const place of trip.places) {
  if (place.photo && !place.photo.startsWith('data:') && !fs.existsSync(path.join(root, place.photo))) throw new Error('Missing image: ' + place.photo);
}
fs.mkdirSync(out, {recursive: true});
for (const file of ['index.html', 'app.js', 'data.js', 'styles.css']) fs.copyFileSync(path.join(root, file), path.join(out, file));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), {recursive: true});
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Build complete: dist/ (' + data.reduce((n,t)=>n+t.places.length,0) + ' restaurants)');
