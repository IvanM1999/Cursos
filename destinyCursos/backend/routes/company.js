const router = require('express').Router();
const Company = require('../models/Company');

// criar empresa (cliente SaaS)
router.post('/empresa', async (req, res) => {
   const empresa = await Company.create(req.body);
   res.json(empresa);
});

router.get('/empresa/:id', async (req, res) => {
   const empresa = await Company.findById(req.params.id);
   res.json(empresa);
});

module.exports = router;