const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function getSheet() {
    if (!process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error("Variável GOOGLE_PRIVATE_KEY não encontrada. Verifique o seu .env.local");
    }

    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // O replace garante que quebras de linha da chave privada sejam lidas corretamente
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Extrai o ID caso o usuário tenha colado a URL inteira
    let sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId && sheetId.includes('docs.google.com/spreadsheets/d/')) {
        sheetId = sheetId.split('/d/')[1].split('/')[0];
    }

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
}

module.exports = { getSheet };
