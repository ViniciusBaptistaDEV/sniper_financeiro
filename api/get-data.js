const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    try {
        if (req.headers.authorization !== 'sniper-auth-success') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const doc = await getSheet();
        const sheetCaps = doc.sheetsByTitle['Captacoes'];
        const sheetOps = doc.sheetsByTitle['Operacoes'];
        const sheetConfig = doc.sheetsByTitle['Config'];

        if (!sheetCaps || !sheetOps) {
            throw new Error("Abas 'Captacoes' ou 'Operacoes' não encontradas na planilha. Verifique os nomes das abas.");
        }

        const captacoes = await sheetCaps.getRows();
        const operacoes = await sheetOps.getRows();
        
        let config = { meta_objetivo: 50000 }; // Default
        if (sheetConfig) {
            const configRows = await sheetConfig.getRows();
            const metaRow = configRows.find(r => r.get('chave') === 'meta_objetivo');
            if (metaRow) config.meta_objetivo = metaRow.get('valor');
        }

        return res.status(200).json({
            captacoes: captacoes.map(r => r.toObject()),
            operacoes: operacoes.map(r => r.toObject()),
            config
        });
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        return res.status(500).json({ error: error.message });
    }
};
