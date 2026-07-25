const authService = require('../services/auth.service');

class AuthController {
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        data: null,
        message: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Email and password are required'
        });
      }

      const data = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        data,
        message: 'Login successful'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        data: null,
        message: error.message
      });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      const data = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        data,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();
