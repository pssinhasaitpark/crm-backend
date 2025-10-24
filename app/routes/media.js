import express from 'express';
import path from 'path';

const router = express.Router();

export default (app) => {
    router.get('/media/:name', (req, res) => {
        const { name } = req.params;

        const __dirname = path.dirname(new URL(import.meta.url).pathname);

        res.sendFile(path.join(__dirname, `../uploads/${name}`));
    });

    app.use('/', router);
};