import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import ip from 'request-ip';
import session from 'express-session';
import crypto from 'crypto';
import limit from 'express-rate-limit';
import csurf from 'csurf';
import logger from './Utils/logger';

const PORT = process.env.PORT || 3001;

const app = express();

const run = async () => {
    dotenv.config();

    morgan.token('clientIp', (req) => (req as any).clientIp);
    app.set('json spaces', 2)
        .use(ip.mw())
        .use(helmet())
        .use(csurf({ cookie: true }))
        .use(express.json({ limit: '1mb' }))
        .use(morgan(':clientIp :method :url :status :res[content-length] - :response-time ms'))
        .use(cors({
            origin: 'http://localhost:3000',
            credentials: true
        }))
        .use(limit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false
        }))
        .use(session({
            secret: crypto.randomBytes(64).toString('hex'),
            resave: false,
            saveUninitialized: true,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            }
        }));
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.setHeader('X-Powered-By', 'NXR-SERVER');
        next();
    });

    if (process.env.LOG_REQUESTS === 'true') {
        app.use((req, res, next) => {
            logger.info(`Petición: ${req.method} ${req.url}`);
            next();
        });
    }
}