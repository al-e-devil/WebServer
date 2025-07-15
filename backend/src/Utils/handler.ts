import path from 'path';
import express, { Request, Response, NextFunction, Router } from 'express';
import Loader from './System/loader';
import Config from './System/config';
import Func from './utils';

const router: Router = express.Router();

const createRouter = async (): Promise<Router | undefined> => {
    try {
        await Loader.router(path.join(__dirname, '../Routes'));
        const routers = Object.values(Loader.plugins);
        routers.forEach((v: any) => {
            const route = v
            if (route.name) Config.collection.push({
                category: Func.ucword(route.category),
                base_code: Buffer.from(route.category.toLowerCase()).toString('base64'),
                name: route.name,
                path: route.example ? `${route.path}?${new URLSearchParams(Object.entries(route.example)).toString()}` : route.path,
                method: route.method.toUpperCase(),
                raw: {
                    path: route.path,
                    example: route.example || null
                },
                error: route.error,
                premium: route.premium,
                logger: route.logger || false,
            });

            const error = (route.error ? (req: Request, res: Response, next: NextFunction) => {
                res.json({
                    creator: Config.data.settings?.creator,
                    status: false,
                    msg: `Sorry, this feature is currently error and will be fixed soon`
                });
            } : (req: Request, res: Response, next: NextFunction) => {
                next()
            })

            const requires = (!route.requires ? (req: Request, res: Response, next: NextFunction) => {
                const reqFn = route.method === 'get' ? 'reqGet' : 'reqPost';
                const check = Config.status[reqFn](req, route.parameter);
                if (!check.status) return res.json(check);
                const reqType = route.method === 'get' ? 'query' : 'body';
                if ('url' in req[reqType]) {
                    const isUrl = Config.status.url(req[reqType].url);
                    if (!isUrl.status)
                        return res.json(isUrl);
                    next();
                } else next();
            } : route.requires);

            const validator = (route.validator ? route.validator : (req: Request, res: Response, next: NextFunction) => {
                next()
            })

            if (typeof (router as any)[route.method] === 'function') {
                (router as any)[route.method.toLowerCase()](route.path, error, requires, validator, route.execution);
            }
        })
        return router
    } catch (err) {
        if (err instanceof Error) {
            throw new Error(`Failed to load routers: ${err.message}`)
        }
    }
}

export default createRouter