const express = require("express");
const router = express();

const userController = require("../controllers/userController");

router.post("/verify", userController.userVerification);
router.post("/login", userController.login);
router.post("/register", userController.register);
router.post("/new-call", userController.newCall);

module.exports = router;
