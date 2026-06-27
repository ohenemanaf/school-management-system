const fs = require('fs');
const path = require('path');

const rootDirs = [
    path.join(__dirname, 'backend'),
    path.join(__dirname, 'frontend/src')
];

function replaceInFile(filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.sql') || filePath.endsWith('.json') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Strict casing replacements
        content = content.replace(/TEACHER/g, 'LECTURER');
        content = content.replace(/Teacher/g, 'Lecturer');
        content = content.replace(/teacher/g, 'lecturer');
        
        // Plurals handled naturally: TEACHERS -> LECTURERS, Teachers -> Lecturers, teachers -> lecturers

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Replaced content in: ${filePath}`);
        }
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.gemini') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
            
            // Rename directory if it contains 'teacher'
            if (file.toLowerCase().includes('teacher')) {
                const newName = file.replace(/teacher/g, 'lecturer').replace(/Teacher/g, 'Lecturer').replace(/TEACHER/g, 'LECTURER');
                const newPath = path.join(dir, newName);
                fs.renameSync(fullPath, newPath);
                console.log(`Renamed directory: ${fullPath} -> ${newPath}`);
            }
        } else {
            replaceInFile(fullPath);
            
            // Rename file if it contains 'teacher'
            if (file.toLowerCase().includes('teacher')) {
                const newName = file.replace(/teacher/g, 'lecturer').replace(/Teacher/g, 'Lecturer').replace(/TEACHER/g, 'LECTURER');
                const newPath = path.join(dir, newName);
                fs.renameSync(fullPath, newPath);
                console.log(`Renamed file: ${fullPath} -> ${newPath}`);
            }
        }
    }
}

// 1. Process files and file content
rootDirs.forEach(dir => {
    if (fs.existsSync(dir)) walkDir(dir);
});

console.log('Mass replace complete.');
