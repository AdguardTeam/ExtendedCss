/* eslint-disable no-console */
import {
    createServer,
    IncomingMessage,
    ServerResponse,
    Server,
} from 'http';
import { promises as fsp } from 'fs';
import path from 'path';

import { getErrorMessage } from '../../src/common/utils/error';

const QUERY_START_MARKER = '?';
const DEFAULT_PORT = 8585;
const TEST_TEMP_DIR = '../dist';

const initServer = (): Server => {
    return createServer(async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (!req || !req.url) {
            throw new Error('Unable to create server');
        }
        let filename = req.url;
        const queryStartPosition = filename.indexOf(QUERY_START_MARKER);
        if (queryStartPosition && queryStartPosition > -1) {
            filename = req.url.slice(0, queryStartPosition);
        }

        let data;
        try {
            data = await fsp.readFile(path.join(__dirname, TEST_TEMP_DIR, filename));
            res.writeHead(200);
            res.end(data);
        } catch (e: unknown) {
            console.log(getErrorMessage(e));
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }
    });
};

const startServer = (server: Server, port: number | undefined): Promise<void> => {
    let logMessage: string;
    if (!port) {
        port = DEFAULT_PORT;
        logMessage = `Server starting on default port: ${port}`;
    } else {
        logMessage = `Server starting on specified port: ${port}`;
    }

    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(logMessage);
            resolve();
        });
    });
};

const stopServer = (server: Server): Promise<void> => {
    return new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });
};

const server = (() => {
    let s: Server;

    const start = async (port?: number | undefined): Promise<void> => {
        s = initServer();
        console.log(' START ');
        await startServer(s, port);
    };

    const stop = async (): Promise<void> => {
        console.log('Server closing');
        await stopServer(s);
    };

    return {
        start,
        stop,
    };
})();

export default server;
