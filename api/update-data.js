const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Método não permitido' });

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

        // Atribui os novos valores para as colunas da planilha
        row.set('lucro_bruto_recebido', body.lucro_bruto_recebido);
        row.set('lucro_guardado', body.lucro_guardado);
        row.set('lucro_usado_parcela', body.lucro_usado_parcela);
        row.set('lucro_gastos_pessoais', body.lucro_gastos_pessoais);
        row.set('status', body.status);
        row.set('data_fim', body.data_fim);

        await row.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        return res.status(500).json({ error: error.message });
    }
};