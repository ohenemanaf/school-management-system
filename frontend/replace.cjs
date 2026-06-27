const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/USER/Desktop/SCHOOL MANAGEMENT SYSTEM/frontend/src');
let changedCount = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const orig = content;
    
    content = content.replace(/violet/g, 'primary').replace(/indigo/g, 'primary');
    
    if (content !== orig) {
        fs.writeFileSync(f, content, 'utf8');
        changedCount++;
    }
});

console.log('Changed ' + changedCount + ' files');
