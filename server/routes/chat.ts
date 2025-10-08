import express from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage.js';
import { autoConfig } from '../config.js';
import { sanitizeChatMessage } from '../utils/text-sanitizer.js';
// Image processing removed - now using direct Supabase Storage

const router = express.Router();

// Rate limiting middleware for chat
const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute per IP
  message: {
    error: 'Muitas mensagens enviadas. Tente novamente em um minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware for input sanitization using DOMPurify
const sanitizeInput = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.body.message) {
    // Use DOMPurify-based sanitization for robust XSS protection
    req.body.message = sanitizeChatMessage(req.body.message);
  }
  next();
};

// Get chat settings - Convert bytea to base64 for frontend compatibility
router.get('/settings', async (req, res) => {
  try {
    let settings = await storage.getChatSettings();
    
    if (!settings) {
      console.log('📋 [CHAT-BYTEA] No chat settings found, creating default settings...');
      settings = await storage.createDefaultChatSettings();
    }
    
    // Chat icons from Supabase Storage URLs
    const responseSettings = { ...settings };
    
    // Chat icons served directly from Supabase Storage URLs only
    if (settings.botIconUrl) {
      responseSettings.botIcon = settings.botIconUrl as any;
    }
    
    if (settings.userIconUrl) {
      responseSettings.userIcon = settings.userIconUrl as any;
    }
    
    console.log('✅ [CHAT] Chat settings retrieved:', {
      hasBotIcon: !!responseSettings.botIcon,
      hasUserIcon: !!responseSettings.userIcon,
      botIconUrl: responseSettings.botIcon,
      userIconUrl: responseSettings.userIcon
    });
    
    res.json(responseSettings);
  } catch (error) {
    console.error('❌ [CHAT] Error fetching chat settings:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'SETTINGS_FETCH_ERROR'
    });
  }
});


// Send message to AI webhook
router.post('/send', chatRateLimit, sanitizeInput, async (req, res) => {
  try {
    const { message, sessionId, timestamp } = req.body;
    const startTime = Date.now();
    
    // Validate required fields
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Mensagem e ID de sessão são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    // Additional message validation (already sanitized by middleware)
    if (!message.trim()) {
      return res.status(400).json({
        error: 'Mensagem não pode estar vazia',
        code: 'EMPTY_MESSAGE'
      });
    }

    const chatConfig = autoConfig.getConfig();
    const { webhookUrl } = chatConfig;
    
    console.log('🚀 [CHAT-WEBHOOK] Sending message to webhook:', {
      webhookUrl,
      sessionId,
      messageLength: message.length,
      hasTimestamp: !!timestamp
    });
    
    if (!webhookUrl) {
      return res.status(503).json({ 
        error: 'Chat não configurado. Configure o webhook no painel administrativo.',
        code: 'WEBHOOK_NOT_CONFIGURED'
      });
    }

    // Format message with metadata
    const payload = {
      message: message.trim(),
      sessionId,
      timestamp: timestamp || new Date().toISOString(),
      metadata: {
        source: 'unipetplan',
        channel: 'web',
        environment: process.env.NODE_ENV || 'production'
      }
    };

    // Send to webhook with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UnipetPlan/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ [CHAT-WEBHOOK] Response received in ${elapsed}ms:`, {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [CHAT-WEBHOOK] Webhook error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        return res.status(response.status).json({ 
          error: `Erro do webhook: ${response.statusText}`,
          code: 'WEBHOOK_ERROR',
          details: errorText
        });
      }

      // Handle different response content types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { response: text };
      }

      console.log('✅ [CHAT-WEBHOOK] Success response:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length
      });
      
      res.json({
        success: true,
        response: data.response || data.message || 'Mensagem recebida',
        metadata: {
          sessionId,
          timestamp: new Date().toISOString(),
          processingTime: elapsed
        }
      });
    } catch (fetchError: any) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ [CHAT-WEBHOOK] Request timeout after 30s');
        return res.status(504).json({
          error: 'Tempo limite excedido ao aguardar resposta',
          code: 'TIMEOUT_ERROR'
        });
      }
      
      console.error('❌ [CHAT-WEBHOOK] Fetch error:', fetchError);
      return res.status(502).json({
        error: 'Erro ao conectar com o serviço de chat',
        code: 'CONNECTION_ERROR',
        details: fetchError.message
      });
    }
  } catch (error: any) {
    console.error('❌ [CHAT] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

export default router;