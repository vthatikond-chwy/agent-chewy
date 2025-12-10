/**
 * File utility functions
 */
import * as fs from 'fs';
import * as path from 'path';
export function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
export function sanitizeFilename(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
export function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    ensureDirectoryExists(dir);
    fs.writeFileSync(filePath, content, 'utf-8');
}
export function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}
export function fileExists(filePath) {
    return fs.existsSync(filePath);
}
//# sourceMappingURL=file-utils.js.map