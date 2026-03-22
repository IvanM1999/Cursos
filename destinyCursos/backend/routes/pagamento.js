const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_KEY);
const axios = require('axios');


// 💳 STRIPE (cartão)
router.post('/pagar/cartao', async (req, res) => {
   
   const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
         price_data: {
            currency: 'brl',
            product_data: { name: 'Plano Corporativo NR' },
            unit_amount: 4990
         },
         quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://seusite.com/sucesso',
      cancel_url: 'https://seusite.com/erro'
   });
   
   res.json({ url: session.url });
});


// ⚡ PIX (ASAAS)
router.post('/pagar/pix', async (req, res) => {
   
   const response = await axios.post(
      'https://sandbox.asaas.com/api/v3/payments',
      {
         customer: req.body.customerId,
         billingType: 'PIX',
         value: 49.90,
         dueDate: new Date()
      },
      {
         headers: {
            'access_token': process.env.ASAAS_KEY
         }
      }
   );
   
   res.json(response.data);
});

module.exports = router;