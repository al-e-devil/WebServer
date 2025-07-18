import bcrypt from 'bcrypt';
import { Server, Socket } from 'socket.io';
import { database } from '../Config/database';
import { encrypt, decrypt } from '../Utils/crypto';
import { login, register } from '../Utils/validators';
import { User, INITIAL_BALANCE } from '../Types/user';
import logger from '../Utils/logger';

export default {
    name: 'AuthSocket',
    description: 'Socket authentication management',
    events: ['login', 'register'],
    file: 'auth.ts',

    execution(io: Server) {
        io.on('connection', (socket: Socket) => {
            socket.on('login', async (encrypted: string) => {
                const db = await database.init({ path: './Database/database.db', needProfiling: true });
                await db.read();
                try {
                    const { username, email, password } = decrypt(encrypted);
                    const code = login({ username, email, password });

                    if (code) {
                        logger.warn({ username, email }, `Invalid login: ${code}`);
                        return socket.emit('login_response', encrypt({
                            success: false,
                            error: 'Invalid data.',
                            code
                        }));
                    }

                    const users = Array.isArray(db.data.users) ? db.data.users : [];
                    const user = users.find(u =>
                        (username && u.username === username) || (email && u.email === email)
                    );

                    if (!user) {
                        logger.warn({ username, email }, 'User not found in login');
                        return socket.emit('login_response', encrypt({
                            success: false,
                            error: 'User not found.',
                            code: 'USER_NOT_FOUND'
                        }));
                    }

                    if (user.status !== 'active') {
                        logger.warn({ username, email, status: user.status }, 'User inactive in login');
                        return socket.emit('login_response', encrypt({
                            success: false,
                            error: 'Account inactive.',
                            code: 'USER_INACTIVE'
                        }));
                    }

                    const isMatch = await bcrypt.compare(password, user.password as string);
                    if (!isMatch) {
                        logger.warn({ username, email }, 'Wrong password in login');
                        return socket.emit('login_response', encrypt({
                            success: false,
                            error: 'Wrong password.',
                            code: 'WRONG_PASSWORD'
                        }));
                    }

                    logger.info({ username, email }, 'Login successful');
                    user.lastLogin = new Date().toISOString();
                    await db.write();

                    socket.emit('login_response', encrypt({
                        success: true,
                        userId: user.id,
                        username: user.username,
                        email: user.email
                    }));
                } catch (err: any) {
                    logger.error({ error: err.message }, 'Error in login');
                    socket.emit('login_response', encrypt({
                        success: false,
                        error: 'Server error.',
                        code: 'SERVER_ERROR',
                        details: err.message
                    }));
                }
            });

            socket.on('register', async (encrypted: string) => {
                const db = await database.init({ path: './Database/database.db', needProfiling: true });
                await db.read();
                try {
                    const { email, username, realName, password } = decrypt(encrypted);
                    const code = register({ email, username, realName, password });

                    if (code) {
                        logger.warn({ username, email }, `Invalid registration: ${code}`);
                        return socket.emit('register_response', encrypt({ success: false, error: 'Invalid data.', code }));
                    }

                    const users = Array.isArray(db.data.users) ? db.data.users : [];

                    if (users.some(u => u.username === username)) {
                        logger.warn({ username }, 'Username already exists in registration');
                        return socket.emit('register_response', encrypt({ success: false, error: 'Username already exists.', code: 'USERNAME_EXISTS' }));
                    }

                    if (users.some(u => u.email === email)) {
                        logger.warn({ email }, 'Email already registered in registration');
                        return socket.emit('register_response', encrypt({ success: false, error: 'Email already registered.', code: 'EMAIL_EXISTS' }));
                    }

                    const hashed = await bcrypt.hash(password, 10);
                    const newUser: User = {
                        id: (Date.now() + Math.random()).toString(36),
                        username,
                        email,
                        realName,
                        password: hashed,
                        balance: INITIAL_BALANCE,
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        lastLogin: '',
                        transactions: [],
                        bets: [],
                        withdrawals: []
                    };

                    users.push(newUser);
                    db.data.users = users;
                    await db.write();

                    logger.info({ username, email }, 'Registration successful');
                    socket.emit('register_response', encrypt({
                        success: true,
                        userId: newUser.id,
                        username: newUser.username,
                        email: newUser.email
                    }));
                } catch (err: any) {
                    logger.error({ error: err.message }, 'Error in registration');
                    socket.emit('register_response', encrypt({
                        success: false,
                        error: 'Server error.',
                        code: 'SERVER_ERROR',
                        details: err.message
                    }));
                }
            });
        });
    }
};
