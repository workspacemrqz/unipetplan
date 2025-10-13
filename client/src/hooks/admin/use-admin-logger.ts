/**
 * Hook customizado para registrar ações administrativas
 * Todas as ações do painel admin devem ser registradas para auditoria
 */

export interface AdminLogData {
  actionType: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'imported' | 'sent' | 'activated' | 'deactivated';
  entityType: 'client' | 'contract' | 'plan' | 'procedure' | 'coupon' | 'network_unit' | 'user' | 'seller' | 'faq' | 'settings' | 'atendimento' | 'pet' | 'evaluation' | 'contact_submission' | 'payment' | 'report';
  entityId: string;
  metadata?: Record<string, any>;
}

export function useAdminLogger() {
  const logAction = async (data: AdminLogData) => {
    try {
      const response = await fetch('/admin/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session-based auth
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to log admin action:', await response.text());
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging should not break the main functionality
    }
  };

  return { logAction };
}
