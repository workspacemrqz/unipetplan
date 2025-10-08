import csrf from "csurf";
import { Request, Response, NextFunction } from "express";

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Middleware to generate and send CSRF token
export function csrfToken(req: Request, res: Response, next: NextFunction) {
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({ error: "CSRF token validation failed" });
    }
    
    // Generate token and send it in response
    const token = (req as any).csrfToken();
    res.locals.csrfToken = token;
    
    // Also send token as a header for API responses
    res.setHeader('X-CSRF-Token', token);
    
    next();
  });
}

// Middleware to validate CSRF token
export function validateCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for webhook endpoints (they come from external services)
  if (req.path.includes('/webhooks/')) {
    return next();
  }

  // Skip CSRF for GET requests (they should be idempotent)
  if (req.method === 'GET') {
    return next();
  }

  csrfProtection(req, res, (err) => {
    if (err) {
      console.error('❌ CSRF validation failed:', err.message);
      return res.status(403).json({ 
        error: "Requisição inválida. Por favor, recarregue a página e tente novamente.",
        code: "CSRF_TOKEN_INVALID"
      });
    }
    next();
  });
}

// Export the base protection for specific use cases
export { csrfProtection };

// Export a middleware that generates a token endpoint
export function getCsrfToken(req: Request, res: Response) {
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to generate CSRF token" });
    }
    
    const token = (req as any).csrfToken();
    res.json({ csrfToken: token });
  });
}