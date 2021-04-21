/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8585;
const ROOT_PATH = '../';

const httpServer = http.createServer((req, res) => {
    const indexFile = 'index.html';
    const filename = req.url === '/' || req.url.match(/\/\?/) ? indexFile : req.url;
    const filePath = path.join(__dirname, ROOT_PATH, filename);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(err.message);
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
});

const server = {
    port: PORT,
    start() {
        return new Promise((resolve) => {
            httpServer.listen(PORT, () => {
                resolve();
            });
        });
    },
    stop() {
        return new Promise((resolve) => {
            httpServer.close(() => {
                resolve();
            });
        });
    },
};

module.exports = { server };
