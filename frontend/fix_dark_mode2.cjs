const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
    { regex: /(?<!dark:)bg-\[\#F0F4F8\]/g, replace: 'bg-[#F0F4F8] dark:bg-slate-900' },
    { regex: /(?<!dark:)border-white/g, replace: 'border-white dark:border-slate-700/50' },
    { regex: /dark:bg-slate-900\/50\/50/g, replace: 'dark:bg-slate-900/50' }, // fix double /50
];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modifiedCount = 0;

walkDir(directoryPath, function(filePath) {
    if (filePath.endsWith('.jsx')) {
        let originalContent = fs.readFileSync(filePath, 'utf8');
        let newContent = originalContent;

        replacements.forEach(rep => {
            newContent = newContent.replace(rep.regex, rep.replace);
        });

        if (originalContent !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            modifiedCount++;
            console.log(`Modified: ${filePath}`);
        }
    }
});

console.log(`\nFinished! Modified ${modifiedCount} files.`);
