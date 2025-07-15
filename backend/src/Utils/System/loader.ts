import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const resolve = path.resolve;

const scandir = async (dir: string): Promise<string[]> => {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = resolve(dir, subdir);
        return (await stat(res)).isDirectory() ? scandir(res) : res;
    }));
    return files.flat();
};

export default new class Loader {
    public plugins: Record<string, any> = {}

    public async router(dir: string): Promise<void> {
        const files = await scandir(dir);
        const entries: [string, any][] = [];
        for (const file of files) {
            if (file.endsWith('.ts') || file.endsWith('.js')) {
                const name = path.basename(file).replace(/\.(ts|js)$/, '');
                const mod = await import(file);
                entries.push([name, mod.default || mod]);
            }
        }
        this.plugins = Object.fromEntries(entries);
    }
}