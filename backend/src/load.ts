import { Express, Router } from 'express';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import debug from 'debug';

const log = debug('app:route-loader');

export interface RouteLoaderOptions {
    routesDir?: string;
    extensions?: string[];
}

export class RouteLoader {
    private readonly routesDir: string;
    private readonly extensions: string[];

    constructor(private readonly app: Express, options: RouteLoaderOptions = {}) {
        this.routesDir = options.routesDir ?? path.join(__dirname, 'Routes');
        this.extensions = options.extensions ?? ['.routes.js', '.routes.ts'];
        log(`Inicializando RouteLoader en ${this.routesDir}`);
    }

    public async load(): Promise<void> {
        await this.scanDirectory(this.routesDir, '/');
    }

    private async scanDirectory(dir: string, mountPath: string): Promise<void> {
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true }) as unknown as fs.Dirent[];
        } catch (err: any) {
            log(`Error leyendo directorio ${dir}: ${err.message}`);
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const routeMount = path.join(mountPath, entry.isDirectory() ? entry.name : '').replace(/\\/g, '/');

            if (entry.isDirectory()) {
                await this.scanDirectory(fullPath, routeMount);
            } else if (this.isRouteFile(entry.name)) {
                await this.registerRoute(fullPath, routeMount);
            }
        }
    }

    private isRouteFile(fileName: string): boolean {
        return this.extensions.some(ext => fileName.endsWith(ext));
    }

    private async registerRoute(filePath: string, mountPath: string): Promise<void> {
        let mod: any;
        try {
            mod = require(filePath);
        } catch (err: any) {
            log(`Error cargando módulo ${filePath}: ${err.message}`);
            return;
        }

        const router = mod.default ?? mod;
        if (this.isExpressRouter(router)) {
            this.app.use(mountPath, router as Router);
            log(`Montada ruta [${mountPath}] ← ${filePath}`);
        } else {
            log(`El módulo ${filePath} no exporta un Express Router válido.`);
        }
    }

    private isExpressRouter(obj: any): obj is Router {
        return (
            typeof obj === 'function' &&
            Array.isArray((obj as any).stack)
        );
    }
}