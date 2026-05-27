const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    try {
        if (req.headers.authorization !== 'sniper-auth-success') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { meta } = body;

        const doc = await getSheet();
        const sheetConfig = doc.sheetsByTitle['Config'];
        
        if (!sheetConfig) return res.status(404).json({ error: "Aba 'Config' não encontrada." });

        const rows = await sheetConfig.getRows();
        const metaRow = rows.find(r => r.get('chave') === 'meta_objetivo');

        if (metaRow) {
            metaRow.set('valor', meta);
            await metaRow.save();
        } else {
            await sheetConfig.addRow({ chave: 'meta_objetivo', valor: meta });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};