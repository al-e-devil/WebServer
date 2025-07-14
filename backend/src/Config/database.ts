import Database from 'better-sqlite3';
import P, { Logger } from 'pino';
import { performance } from 'perf_hooks';
import * as Proto from '../../Proto/database';
import fs from 'fs';

export const profiling = (name: string, func: () => any, logger: Logger) => {
    const start = performance.now()
    func()
    const end = performance.now()
    logger.info(`${name} took ${(end - start).toFixed(2)}ms`)
};

export class database {
    public logger: Logger
    public path: string
    public data: Proto.database.Icollection
    public needProfiling: boolean
    private db: Database.Database

    /**
     * Creates a new database instance.
     *
     * @param {Object} [options] - The options to use.
     * @param {string} [options.path] - The path to the SQLite database file.
     * @param {Logger} [options.logger] - The logger to use.
     * @param {boolean} [options.needProfiling] - Whether to profile the read operation.
     */
    constructor({ path, logger, needProfiling }: { path: string, logger: Logger, needProfiling: boolean }) {
        this.path = path
        this.logger = logger
        this.data = Proto.database.collection.create({
            users: {},
            cookies: {},
            settings: {},
        });

        this.needProfiling = needProfiling;

        const dir = require('path').dirname(path)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        this.db = new Database(path)
        this.db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
            PRAGMA cache_size = -64000;
            CREATE TABLE IF NOT EXISTS storage (
                id INTEGER PRIMARY KEY,
                data BLOB
            );
        `);

        if (this.needProfiling) {
            profiling('read', this.read.bind(this), this.logger);
        } else {
            this.read.bind(this)();
        }

        logger.info(`Database in archive ${path} initialized`);
    }

    /**
     * Reads data from the database archive.
     * If the data is already in cache, it reads from there.
     * If not, it reads from the database file.
     */
    public async read() {
        this.logger.info("Trying to decode data");
        try {
            const row: any = this.db.prepare('SELECT data FROM storage WHERE id = ?').get(1);
            if (row) {
                const buffer = row.data as Buffer;
                this.data = Proto.database.collection.decode(buffer);
                this.logger.info(`Database in archive ${this.path} read from cache (Size: ${buffer.length} bytes)`);
            }
        } catch (error) {
            this.logger.error(error);
        }
    }

    /**
     * Writes data to the database archive.
     * If this.needProfiling is true, it will profile the write operation and log the time it took.
     * If not, it will just write.
     */
    public async write() {
        try {
            const writeOperation = () => {
                const writer = Proto.database.collection.encode(this.data);
                const buffer = writer.finish();
                this.db.transaction(() => {
                    this.db.prepare('INSERT OR REPLACE INTO storage (id, data) VALUES (?, ?)').run(1, Buffer.from(buffer));
                })();
            }

            if (this.needProfiling) profiling('write', writeOperation, this.logger);
            else await writeOperation();
            this.logger.info(`Database in archive ${this.path} written`);
        } catch (error) {
            this.logger.error(error);
        }
    }
}

export const db = new database({ path: '../../Database/database.db', logger: P({ level: 'silent' }), needProfiling: true })