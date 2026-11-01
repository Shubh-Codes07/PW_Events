import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Authentication middleware that verifies the incoming Bearer JWT against Supabase Auth.
 * Attaches the authenticated user object to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication token required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired session token',
          code: 'UNAUTHORIZED',
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH ERROR]:', err);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'UNAUTHORIZED',
      },
    });
  }
}
