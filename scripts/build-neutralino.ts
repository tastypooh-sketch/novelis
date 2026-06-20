import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Neutralino Build Pipeline for Novelis
 * 
 * This script:
 * 1. Locates the exported nove.html
 * 2. Prepares the Neutralino shell environment
 * 3. Builds the native executable for Linux/ChromeOS
 */

async function buildNeutralino(exportedHtmlPath: string) {
    const SHELL_DIR = join(process.cwd(), 'neutralino-shell');
    const RESOURCE_DIR = join(SHELL_DIR, 'resources');
    const TARGET_INDEX = join(RESOURCE_DIR, 'index.html');

    console.log('--- Novelis Neutralino Build Pipeline ---');
    
    if (!existsSync(exportedHtmlPath)) {
        console.error(`Error: Exported HTML not found at ${exportedHtmlPath}`);
        process.exit(1);
    }

    // 1. Ensure directories exist
    if (!existsSync(RESOURCE_DIR)) {
        mkdirSync(RESOURCE_DIR, { recursive: true });
    }

    // 2. Overwrite the shell's resources with the new document
    console.log(`Deploying ${exportedHtmlPath} to shell resources...`);
    copyFileSync(exportedHtmlPath, TARGET_INDEX);

    // 3. Trigger Neutralino build
    console.log('Triggering Neutralino build...');
    try {
        // Change directory to the shell folder
        process.chdir(SHELL_DIR);
        
        // Run neutralino build command
        // Using npx to ensure we use the local version if installed, or latest
        execSync('npx @neutralinojs/neu build', { stdio: 'inherit' });
        
        console.log('\nSUCCESS: Neutralino build completed.');
        console.log('The executables are available in neutralino-shell/dist/');
    } catch (error) {
        console.error('Neutralino build failed:', error);
        process.exit(1);
    }
}

// Example usage from CLI:
// node build-neutralino.js ./path/to/exported/nove.html
const inputPath = process.argv[2];
if (inputPath) {
    buildNeutralino(inputPath);
} else {
    console.log('Usage: npx tsx scripts/build-neutralino.ts <path_to_nove_html>');
}
