import { QueryClient } from "@tanstack/react-query";
import type { Client, Plan, Pet, GuideWithNetworkUnit } from "@shared/schema";

// Cache invalidation utilities for intelligent cache management
export class CacheManager {
  constructor(private queryClient: QueryClient) {}

  // Invalidate all queries related to clients
  invalidateClientData(clientId?: string) {
    const invalidationPromises = [];
    
    // Always invalidate the main clients list
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ queryKey: ["/admin/api/clients"] })
    );
    
    // If specific client, also invalidate search results and client details
    if (clientId) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/clients", clientId] })
      );
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/clients", clientId, "pets"] })
      );
    }
    
    // Invalidate any search results (they might contain the updated client)
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/clients/search"
      })
    );
    
    // Dashboard might show client counts, so invalidate it too
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/dashboard/all"
      })
    );

    return Promise.all(invalidationPromises);
  }

  // Invalidate all queries related to plans
  invalidatePlanData(planId?: string) {
    const invalidationPromises = [];
    
    // Always invalidate the main plans list and active plans
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ queryKey: ["/admin/api/plans"] })
    );
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ queryKey: ["/admin/api/plans", "active"] })
    );
    
    // If specific plan, invalidate its details
    if (planId) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/plans", planId] })
      );
    }
    
    // Plans might affect procedure relationships
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/procedures" && 
          query.queryKey.length > 1 && 
          query.queryKey[2] === "plans"
      })
    );

    // Dashboard shows plan counts
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/dashboard/all"
      })
    );

    return Promise.all(invalidationPromises);
  }

  // Invalidate all queries related to pets
  invalidatePetData(petId?: string, clientId?: string) {
    const invalidationPromises = [];
    
    // If we know the client, invalidate their pets specifically
    if (clientId) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/clients", clientId, "pets"] })
      );
    }
    
    // If specific pet, invalidate its details
    if (petId) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/pets", petId] })
      );
    }
    
    // Pets affect dashboard counts
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/dashboard/all"
      })
    );
    
    // Guides might reference pets
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/guides" || 
          query.queryKey[0] === "/admin/api/guides/with-network-units"
      })
    );

    return Promise.all(invalidationPromises);
  }

  // Invalidate all queries related to guides
  invalidateGuideData(guideId?: string) {
    const invalidationPromises = [];
    
    // Invalidate all guide-related queries
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/guides" || 
          query.queryKey[0] === "/admin/api/guides/with-network-units"
      })
    );
    
    // If specific guide, invalidate its details
    if (guideId) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({ queryKey: ["/admin/api/guides", guideId] })
      );
    }
    
    // Dashboard shows guide counts
    invalidationPromises.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/admin/api/dashboard/all"
      })
    );

    return Promise.all(invalidationPromises);
  }

  // Optimistic update for client data
  updateClientOptimistically(clientId: string, updatedData: Partial<Client>) {
    // Update clients list
    this.queryClient.setQueryData(["/admin/api/clients"], (oldData: Client[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(client => 
        client.id === clientId ? { ...client, ...updatedData } : client
      );
    });

    // Update individual client data
    this.queryClient.setQueryData(["/admin/api/clients", clientId], (oldData: Client | undefined) => {
      if (!oldData) return oldData;
      return { ...oldData, ...updatedData };
    });
  }

  // Optimistic update for plan data
  updatePlanOptimistically(planId: string, updatedData: Partial<Plan>) {
    // Update plans list
    this.queryClient.setQueryData(["/admin/api/plans"], (oldData: Plan[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(plan => 
        plan.id === planId ? { ...plan, ...updatedData } : plan
      );
    });

    // Update active plans list if the plan is active
    if (updatedData.isActive !== false) {
      this.queryClient.setQueryData(["/admin/api/plans", "active"], (oldData: Plan[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(plan => 
          plan.id === planId ? { ...plan, ...updatedData } : plan
        );
      });
    }
  }

  // Optimistic add for new client
  addClientOptimistically(newClient: Client) {
    this.queryClient.setQueryData(["/admin/api/clients"], (oldData: Client[] | undefined) => {
      if (!oldData) return [newClient];
      return [newClient, ...oldData];
    });
  }

  // Optimistic remove for deleted client
  removeClientOptimistically(clientId: string) {
    this.queryClient.setQueryData(["/admin/api/clients"], (oldData: Client[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(client => client.id !== clientId);
    });
  }

  // Smart invalidation based on data relationships
  invalidateRelatedData(entityType: string, entityId?: string, additionalContext?: any) {
    switch (entityType) {
      case 'client':
        return this.invalidateClientData(entityId);
      case 'plan':
        return this.invalidatePlanData(entityId);
      case 'pet':
        return this.invalidatePetData(entityId, additionalContext?.clientId);
      case 'guide':
        return this.invalidateGuideData(entityId);
      case 'network-unit':
        // Network units affect multiple entities
        return Promise.all([
          this.queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units"] }),
          this.queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units/credentials"] }),
          this.invalidateGuideData(), // Guides reference network units
          this.queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === "/admin/api/dashboard/all"
          })
        ]);
      case 'procedure':
        return Promise.all([
          this.queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures"] }),
          this.invalidatePlanData(), // Procedures are related to plans
          this.invalidateGuideData() // Guides reference procedures
        ]);
      default:
        // Generic fallback
        return this.queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === "/admin/api/dashboard/all"
        });
    }
  }

  // Clear all admin cache (for logout or major data changes)
  clearAllCache() {
    return this.queryClient.clear();
  }

  // Prefetch related data for better navigation experience
  prefetchRelatedData(entityType: string, entityId: string) {
    switch (entityType) {
      case 'client':
        // When viewing a client, prefetch their pets
        this.queryClient.prefetchQuery({
          queryKey: ["/admin/api/clients", entityId, "pets"],
          staleTime: 10 * 60 * 1000 // 10 minutes
        });
        break;
      case 'plan':
        // When viewing a plan, prefetch related procedures
        this.queryClient.prefetchQuery({
          queryKey: ["/admin/api/plans", entityId, "procedures"],
          staleTime: 15 * 60 * 1000 // 15 minutes
        });
        break;
    }
  }

  // Comprehensive prefetching for admin dashboard navigation
  async prefetchDashboardData() {
    const prefetchPromises = [];
    
    // Prefetch main entity lists with appropriate stale times
    prefetchPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: ["/admin/api/clients"],
        staleTime: 5 * 60 * 1000, // 5 minutes - frequently updated
      })
    );
    
    prefetchPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: ["/admin/api/guides"],
        staleTime: 10 * 60 * 1000, // 10 minutes
      })
    );
    
    prefetchPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: ["/admin/api/guides/with-network-units"],
        staleTime: 10 * 60 * 1000, // 10 minutes
      })
    );
    
    prefetchPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: ["/admin/api/plans"],
        staleTime: 15 * 60 * 1000, // 15 minutes - less frequently updated
      })
    );
    
    prefetchPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: ["/admin/api/plans", "active"],
        staleTime: 15 * 60 * 1000, // 15 minutes
      })
    );

    try {
      await Promise.all(prefetchPromises);
      console.log("📋 [PREFETCH] Dashboard data prefetched successfully");
    } catch (error) {
      console.warn("⚠️ [PREFETCH] Some dashboard data failed to prefetch:", error);
    }
  }

  // Prefetch specific page data when hovering over navigation
  async prefetchPageData(pageType: 'clients' | 'guides' | 'plans' | 'dashboard') {
    const prefetchPromises = [];
    
    switch (pageType) {
      case 'clients':
        // Prefetch clients and some sample pets data
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/clients"],
            staleTime: 5 * 60 * 1000,
          })
        );
        break;
        
      case 'guides':
        // Prefetch guides with network units
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/guides"],
            staleTime: 10 * 60 * 1000,
          })
        );
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/guides/with-network-units"],
            staleTime: 10 * 60 * 1000,
          })
        );
        break;
        
      case 'plans':
        // Prefetch plans data
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/plans"],
            staleTime: 15 * 60 * 1000,
          })
        );
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/plans", "active"],
            staleTime: 15 * 60 * 1000,
          })
        );
        break;
        
      case 'dashboard':
        // Prefetch dashboard aggregated data
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/dashboard/all"],
            staleTime: 2 * 60 * 1000, // 2 minutes - dashboard data changes frequently
          })
        );
        break;
    }

    try {
      await Promise.all(prefetchPromises);
      console.log(`📋 [PREFETCH] ${pageType} data prefetched successfully`);
    } catch (error) {
      console.warn(`⚠️ [PREFETCH] ${pageType} data failed to prefetch:`, error);
    }
  }

  // Prefetch related data for clients (their pets) in bulk
  async prefetchClientsPetsData(clientIds: string[], maxConcurrent: number = 3) {
    if (!clientIds.length) return;

    // Limit concurrent requests to avoid overwhelming the server
    const batches = [];
    for (let i = 0; i < clientIds.length; i += maxConcurrent) {
      batches.push(clientIds.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(clientId =>
        this.queryClient.prefetchQuery({
          queryKey: ["/admin/api/clients", clientId, "pets"],
          staleTime: 10 * 60 * 1000, // 10 minutes
        }).catch(error => {
          console.warn(`⚠️ [PREFETCH] Failed to prefetch pets for client ${clientId}:`, error);
        })
      );

      try {
        await Promise.all(batchPromises);
      } catch (error) {
        console.warn("⚠️ [PREFETCH] Some client pets data failed to prefetch:", error);
      }
    }

    console.log(`📋 [PREFETCH] Pets data prefetched for ${clientIds.length} clients`);
  }

  // Smart prefetching based on user behavior and data relationships
  async smartPrefetch(currentPage: string, userBehavior?: {
    recentlyVisited?: string[];
    commonPaths?: string[];
  }) {
    const prefetchPromises = [];

    // Always prefetch dashboard data as it's commonly accessed
    if (currentPage !== 'dashboard') {
      prefetchPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: ["/admin/api/dashboard/all"],
          staleTime: 2 * 60 * 1000,
        })
      );
    }

    // Prefetch based on current page context
    switch (currentPage) {
      case 'dashboard':
        // From dashboard, users commonly go to clients, guides, or plans
        prefetchPromises.push(this.prefetchDashboardData());
        break;
        
      case 'clients':
        // From clients page, users might check specific client pets or go to guides/plans
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/guides"],
            staleTime: 10 * 60 * 1000,
          })
        );
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/plans", "active"],
            staleTime: 15 * 60 * 1000,
          })
        );
        break;
        
      case 'guides':
        // From guides page, users might need client data or plan information
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/clients"],
            staleTime: 5 * 60 * 1000,
          })
        );
        break;
        
      case 'plans':
        // From plans page, users might check procedures or client assignments
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: ["/admin/api/procedures"],
            staleTime: 15 * 60 * 1000,
          })
        );
        break;
    }

    // Prefetch recently visited pages if provided
    if (userBehavior?.recentlyVisited) {
      for (const page of userBehavior.recentlyVisited.slice(0, 2)) { // Limit to 2 most recent
        if (page !== currentPage) {
          prefetchPromises.push(this.prefetchPageData(page as any));
        }
      }
    }

    try {
      await Promise.all(prefetchPromises.filter(Boolean));
      console.log(`📋 [PREFETCH] Smart prefetch completed for ${currentPage}`);
    } catch (error) {
      console.warn("⚠️ [PREFETCH] Smart prefetch encountered errors:", error);
    }
  }
}

// Export a factory function to create cache manager instances
export const createCacheManager = (queryClient: QueryClient) => new CacheManager(queryClient);

// Export individual utility functions for backward compatibility
export const createSmartInvalidation = (queryClient: QueryClient) => {
  const cacheManager = new CacheManager(queryClient);
  
  return {
    invalidateClientData: cacheManager.invalidateClientData.bind(cacheManager),
    invalidatePlanData: cacheManager.invalidatePlanData.bind(cacheManager),
    invalidatePetData: cacheManager.invalidatePetData.bind(cacheManager),
    invalidateGuideData: cacheManager.invalidateGuideData.bind(cacheManager),
    invalidateRelatedData: cacheManager.invalidateRelatedData.bind(cacheManager),
    updateClientOptimistically: cacheManager.updateClientOptimistically.bind(cacheManager),
    updatePlanOptimistically: cacheManager.updatePlanOptimistically.bind(cacheManager),
    prefetchRelatedData: cacheManager.prefetchRelatedData.bind(cacheManager),
    prefetchDashboardData: cacheManager.prefetchDashboardData.bind(cacheManager),
    prefetchPageData: cacheManager.prefetchPageData.bind(cacheManager),
    prefetchClientsPetsData: cacheManager.prefetchClientsPetsData.bind(cacheManager),
    smartPrefetch: cacheManager.smartPrefetch.bind(cacheManager),
  };
};