import { dashboardRepository } from './dashboard.repository.js';

const ORDER_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export const dashboardService = {
  async getStats() {
    const [totals, byStatus, revenue, lowStock, recent] = await Promise.all([
      dashboardRepository.totals(),
      dashboardRepository.ordersByStatus(),
      dashboardRepository.revenueByDay(14),
      dashboardRepository.lowStock(8),
      dashboardRepository.recentOrders(6),
    ]);

    const counts = new Map(byStatus.map((r) => [r.status, r.count]));

    return {
      revenuePaise: totals.revenue_paise,
      orderCount: totals.order_count,
      customerCount: totals.customer_count,
      products: {
        active: totals.active_products,
        draft: totals.draft_products,
        archived: totals.archived_products,
      },
      ordersByStatus: Object.fromEntries(ORDER_STATUSES.map((s) => [s, counts.get(s) ?? 0])),
      revenueByDay: revenue.map((r) => ({
        day: r.day,
        revenuePaise: r.revenue_paise,
        orders: r.orders,
      })),
      lowStock: {
        total: lowStock[0]?.total ?? 0,
        items: lowStock.map((r) => ({
          variantId: r.variant_id,
          productId: r.product_id,
          productName: r.product_name,
          colorway: r.colorway,
          sizeLabel: r.size_label,
          sku: r.sku,
          quantity: r.quantity,
          lowStockThreshold: r.low_stock_threshold,
        })),
      },
      recentOrders: recent.map((r) => ({
        orderNumber: r.order_number,
        status: r.status,
        totalPaise: r.total_paise,
        placedAt: r.placed_at.toISOString(),
        customerName: r.customer_name,
      })),
    };
  },
};
