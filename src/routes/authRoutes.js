/**
 * src/routes/authRoutes.js
 * -------------------------------------------------------------
 * Account URLs. Middleware runs left to right: e.g. for GET /login,
 * redirectIfLoggedIn runs first, then authController.showLogin.
 */
const express = require('express');
const auth = require('../controllers/authController');
const profile = require('../controllers/profileController');
const { requireLogin, redirectIfLoggedIn } = require('../middleware/auth');

const router = express.Router();

// ---------- Register / login / logout ----------
router.get('/register', redirectIfLoggedIn, auth.showRegister);
router.post('/register', redirectIfLoggedIn, auth.register);
router.get('/login', redirectIfLoggedIn, auth.showLogin);
router.post('/login', redirectIfLoggedIn, auth.login);
router.post('/logout', auth.logout);

// ---------- Own account (must be logged in) ----------
router.get('/dashboard', requireLogin, profile.showDashboard);
router.get('/profile/edit', requireLogin, profile.showEditProfile);
router.post('/profile', requireLogin, profile.updateProfile);
router.post('/profile/password', requireLogin, profile.changePassword);

// ---------- Public profile (anyone can view) ----------
router.get('/users/:id', profile.showPublicProfile);

module.exports = router;
