const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function updateFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace existing animationDuration={...} if any
  content = content.replace(/animationDuration=\{\d+\}/g, 'animationDuration={15000}');

  // Add animationDuration={15000} to tags that don't have it
  const tags = ['Bar', 'Pie', 'Line', 'Area', 'Scatter'];
  tags.forEach(tag => {
    // Match <Tag ... but not if it already has animationDuration
    const regex = new RegExp(`<${tag}(\\s+)(?![^>]*animationDuration)`, 'g');
    content = content.replace(regex, `<${tag}$1animationDuration={15000} `);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('src/app/coach', updateFile);
walkDir('src/components/charts', updateFile);

console.log('Done!');
