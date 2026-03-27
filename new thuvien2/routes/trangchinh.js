const express = require('express');
const router = express.Router();

// Route cho trang chính, không yêu cầu đăng nhập
router.get('/', (req, res) => {
    res.render('trangchinh', { user: req.session.user });
});

module.exports = router;