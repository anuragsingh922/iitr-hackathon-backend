const express = require("express");
const router = express.Router();

const stripeController = require("../controllers/stripeController");

router.post("/create-checkout-session", stripeController.checkoutSession);

module.exports = router;
