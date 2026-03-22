const fs = require('fs');
const PDFDocument = require('pdfkit');

function gerarCertificado(nome, curso, empresa, data, output) {
   
   const doc = new PDFDocument();
   
   doc.pipe(fs.createWriteStream(output));
   
   doc.fontSize(20).text('CERTIFICADO', { align: 'center' });
   
   doc.moveDown();
   
   doc.fontSize(14).text(`Certificamos que ${nome}`);
   doc.text(`Concluiu o curso ${curso}`);
   doc.text(`Empresa: ${empresa}`);
   doc.text(`Data: ${data}`);
   
   doc.moveDown();
   
   doc.text('Carga horária: 40h');
   doc.text('Conforme normas regulamentadoras (NR)');
   
   doc.end();
}

module.exports = gerarCertificado;