const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' });

    try {
        if (req.headers.authorization !== 'sniper-auth-success') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const doc = await getSheet();
        const sheet = doc.sheetsByTitle['Operacoes'];
        const rows = await sheet.getRows();

        // Localiza a linha correta pelo ID da operação
        const row = rows.find(r => r.get('id_operacao') === body.id_operacao);

        if (!row) {
            return res.status(404).json({ error: 'Operação não encontrada' });
        }

        // Remove a linha da planilha
        await row.delete();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir dados:", error);
        return res.status(500).json({ error: error.message });
    }
};