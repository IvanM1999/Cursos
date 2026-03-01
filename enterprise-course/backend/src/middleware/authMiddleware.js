const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'JWT_SECRET nao configurado no servidor'
    });
  }

  // Verificar token JWT no header
  const token = req.headers.authorization?.split(' ')[1];
  
  // Ou verificar sessão
  if (req.session && req.session.userId) {
    return next();
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }
  }
  
  return res.status(401).json({
    success: false,
    message: 'Não autenticado'
  });
};

module.exports = authMiddleware;
