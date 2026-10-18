/**
 * src/routes/apiRoutes.js
 * -------------------------------------------------------------
 * JSON endpoints called by JavaScript in the browser (not full pages).
 */
const express = require('express');
const category = require('../controllers/categoryController');

const router = express.Router();

router.get('/categories', category.listCategories);
router.get('/categories/:key/fields', category.getFields);

module.exports = router;
