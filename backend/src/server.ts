import ip from 'request-ip';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import limit from 'express-rate-limit';
import csurf from 'csurf';
import CFonts from 'cfonts';
import cookieParser from 'cookie-parser'
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import Create from './Utils/handler';
import { database } from './Config/database'

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: 'http://localhost:3000',
        credentials: true
    }
});

const run = async () => {
    const db = await database.init({ path: './Database/database.db', needProfiling: true });
    await db.read();
    dotenv.config();

    morgan.token('clientIp', (req) => (req as any).clientIp);
    app.set('json spaces', 2)
        .use(ip.mw())
        .use(helmet())
        .use(cookieParser())
        .use(csurf({ cookie: true }))
        .use(express.json({ limit: '1mb' }))
        .use('/', (await Create.routes()) ?? express.Router())
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
    })
    await Create.sockets(io);
    server.listen(process.env.WEBSERVER_PORT, () => {
        CFonts.say('Web Server', { 
            font: 'tiny', 
            align: 'center', 
            colors: ['system'] 
        });
        CFonts.say(`Database is connected\nServer listening on port ---> ${process.env.WEBSERVER_PORT}`, { 
            font: 'console', 
            align: 'center', 
            colors: ['system'] 
        });
    });
}

run().catch((err) => {
    console.error('Error al iniciar el servidor:', err)
    process.exit(1)
});