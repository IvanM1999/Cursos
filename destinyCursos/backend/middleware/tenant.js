module.exports = (req, res, next) => {
   const empresaId = req.headers['x-empresa-id'];
   
   if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não informada' });
   }
   
   req.empresaId = empresaId;
   next();
};