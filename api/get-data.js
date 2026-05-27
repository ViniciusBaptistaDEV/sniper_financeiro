import { getSheet } from './sheets-helper';

export default async function handler(req, res) {
    if (req.headers.authorization !== 'sniper-auth-success') return res.status(403).end();

    const doc = await getSheet();
    const sheetCaps = doc.sheetsByTitle['Captacoes'];
    const sheetOps = doc.sheetsByTitle['Operacoes'];

    const captacoes = await sheetCaps.getRows();
    const operacoes = await sheetOps.getRows();

    res.json({
        captacoes: captacoes.map(r => r.toObject()),
        operacoes: operacoes.map(r => r.toObject())
    });
}
