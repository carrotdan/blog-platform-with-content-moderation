const authService = require('../services/auth.service');
const userService = require('../services/user.service');

// L24: Consistent httpOnly refresh cookie + JSON contract across all auth routes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
}

class AuthController {
  async register(req, res) {
    try {
      // Register + auto-login so the client receives access/refresh tokens
      // (consistent with the removed /users/register endpoint)
      const result = await userService.register(req.body);
      setRefreshCookie(res, result.tokens.refreshToken);
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        },
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
      setRefreshCookie(res, data.refreshToken);
      
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
      // H19: Accept the refresh token from the httpOnly cookie or request body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const data = await authService.refreshToken(refreshToken);
      setRefreshCookie(res, data.refreshToken);
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
