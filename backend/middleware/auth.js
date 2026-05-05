const jwt = require('jsonwebtoken');
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};
module.exports = { auth };
