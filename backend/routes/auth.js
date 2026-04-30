const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, uploadAvatar.single('avatar'), updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
