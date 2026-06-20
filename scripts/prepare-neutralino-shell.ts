import * as fs from 'fs';
import * as path from 'path';

async function prepareShell() {
    const shellPath = path.join(process.cwd(), 'neutralino-shell');
    const resourcesPath = path.join(shellPath, 'resources');

    if (!fs.existsSync(shellPath)) fs.mkdirSync(shellPath);
    if (!fs.existsSync(resourcesPath)) fs.mkdirSync(resourcesPath);

    // Create a dummy index.html in resources - this is what gets replaced by Nove export
    const dummyHtml = `<!DOCTYPE html><html><body><h1>Nové Shell</h1><p>This file is replaced during export.</p></body></html>`;
    fs.writeFileSync(path.join(resourcesPath, 'index.html'), dummyHtml);

    console.log('Neutralino shell prepared at', shellPath);
}

prepareShell().catch(console.error);
