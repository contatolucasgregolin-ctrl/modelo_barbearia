/**
 * SecurityUtils.js — Módulo de segurança frontend
 * Baseado nos agentes de ESTRUTURA_seguranca_completo_Agent
 * 
 * Funções:
 * - sanitizeInput: Previne XSS em inputs de formulário
 * - validateNumeric: Garante valores numéricos seguros
 * - checkRole: Verifica permissão do usuário
 * - sanitizeObject: Limpa todos os campos de um objeto
 */

// ── Input Sanitization (Anti-XSS) ──────────────────────────

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
];

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

/**
 * Sanitiza uma string contra XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  let cleaned = input.trim();
  
  // Remove scripts e padrões perigosos
  DANGEROUS_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Encode caracteres HTML especiais
  cleaned = cleaned.replace(/[&<>"'`/]/g, char => HTML_ENTITIES[char] || char);
  
  return cleaned;
}

/**
 * Sanitiza um input permitindo HTML seguro (para campos de descrição)
 */
export function sanitizeRichInput(input) {
  if (typeof input !== 'string') return input;
  
  let cleaned = input.trim();
  
  // Remove apenas scripts perigosos, mantém texto
  DANGEROUS_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned;
}

/**
 * Valida e sanitiza um valor numérico
 */
export function validateNumeric(value, { min = 0, max = 999999, decimals = 2 } = {}) {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  const clamped = Math.min(Math.max(num, min), max);
  return parseFloat(clamped.toFixed(decimals));
}

/**
 * Valida e sanitiza um inteiro
 */
export function validateInteger(value, { min = 0, max = 999999 } = {}) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return 0;
  return Math.min(Math.max(num, min), max);
}

/**
 * Sanitiza todos os campos string de um objeto
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = sanitizeObject(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ── Role-Based Access Control ──────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  BARBER: 'barber',
};

// Permissões por role
const PERMISSIONS = {
  admin: [
    'view_dashboard', 'manage_appointments', 'manage_services',
    'manage_artists', 'manage_customers', 'manage_stock',
    'manage_finances', 'manage_settings', 'manage_gallery',
    'manage_plans', 'manage_promotions', 'manage_roles',
    'view_reports', 'export_data', 'delete_data',
    'manage_categories', 'view_ai_suggestions',
  ],
  manager: [
    'view_dashboard', 'manage_appointments', 'manage_services',
    'manage_artists', 'manage_customers', 'manage_stock',
    'manage_finances', 'manage_gallery',
    'manage_plans', 'manage_promotions',
    'view_reports', 'export_data',
    'manage_categories', 'view_ai_suggestions',
  ],
  barber: [
    'view_dashboard', 'manage_appointments',
    'view_reports',
  ],
};

/**
 * Verifica se um role tem uma permissão específica
 */
export function hasPermission(role, permission) {
  if (!role || !PERMISSIONS[role]) return false;
  return PERMISSIONS[role].includes(permission);
}

/**
 * Retorna todas as permissões de um role
 */
export function getPermissions(role) {
  return PERMISSIONS[role] || [];
}

/**
 * Verifica se o usuário pode acessar uma tab específica do admin
 */
export function canAccessTab(role, tabId) {
  const tabPermissionMap = {
    dashboard: 'view_dashboard',
    appointments: 'manage_appointments',
    subscriptions: 'manage_plans',
    customers: 'manage_customers',
    services: 'manage_services',
    artists: 'manage_artists',
    settings: 'manage_settings',
    finances: 'manage_finances',
    stock: 'manage_stock',
    categories: 'manage_categories',
    'promotion-interests': 'manage_promotions',
    gallery: 'manage_gallery',
    ai: 'view_ai_suggestions',
  };
  
  const requiredPermission = tabPermissionMap[tabId];
  if (!requiredPermission) return true; // Unknown tab = allow
  return hasPermission(role, requiredPermission);
}

// ── Validation Helpers ─────────────────────────────────────

/**
 * Valida um SKU (formato: ABC-123)
 */
export function validateSKU(sku) {
  if (!sku) return true; // SKU é opcional
  return /^[A-Z0-9\-]{3,20}$/i.test(sku);
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone) {
  if (!phone) return true;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

/**
 * Limita comprimento de string
 */
export function truncate(str, maxLength = 255) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}
