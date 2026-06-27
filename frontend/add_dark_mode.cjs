const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
    { regex: /(?<!dark:)bg-white/g, replace: 'bg-white dark:bg-slate-800' },
    { regex: /(?<!dark:)bg-slate-50/g, replace: 'bg-slate-50 dark:bg-slate-900/50' },
    { regex: /(?<!dark:)text-slate-800/g, replace: 'text-slate-800 dark:text-slate-100' },
    { regex: /(?<!dark:)text-slate-900/g, replace: 'text-slate-900 dark:text-white' },
    { regex: /(?<!dark:)text-slate-700/g, replace: 'text-slate-700 dark:text-slate-200' },
    { regex: /(?<!dark:)text-slate-500/g, replace: 'text-slate-500 dark:text-slate-400' },
    { regex: /(?<!dark:)text-slate-600/g, replace: 'text-slate-600 dark:text-slate-300' },
    { regex: /(?<!dark:)border-slate-200/g, replace: 'border-slate-200 dark:border-slate-700' },
    { regex: /(?<!dark:)border-slate-100/g, replace: 'border-slate-100 dark:border-slate-700/50' },
    { regex: /(?<!dark:)bg-slate-100/g, replace: 'bg-slate-100 dark:bg-slate-800' }
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

        // Apply replacements
        replacements.forEach(rep => {
            newContent = newContent.replace(rep.regex, rep.replace);
        });

        // Some classes might get duplicated or expanded wrongly if they were e.g. "bg-white text-slate-800 bg-white" but regex handles it mostly.
        // Actually, to prevent double adding if run multiple times, the negative lookbehind `(?<!dark:)` helps, but what if it's `bg-white dark:bg-slate-800`? The lookbehind doesn't prevent `bg-white` from matching because it's not preceded by `dark:`.
        // Let's do a basic deduplication pass on class strings.
        newContent = newContent.replace(/className="([^"]+)"/g, (match, classStr) => {
            let classes = classStr.split(/\s+/);
            let uniqueClasses = [...new Set(classes)];
            return `className="${uniqueClasses.join(' ')}"`;
        });

        if (originalContent !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            modifiedCount++;
            console.log(`Modified: ${filePath}`);
        }
    }
});

console.log(`\nFinished! Modified ${modifiedCount} files.`);
