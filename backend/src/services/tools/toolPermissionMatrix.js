// Role-based tool access control
// Roles (high → low privilege): super_admin > admin > manager > user > customer

const TOOL_ACCESS = {
  manager: {
    denied: ['get_top_customers', 'get_payment_risk_assessment']
  },
  user: {
    denied: [
      'get_financial_summary',
      'get_top_customers',
      'get_payment_risk_assessment',
      'get_debt_aging_report',
      'get_inventory_value'
    ]
  },
  customer: {
    // Whitelist: only these query tools are accessible; all mutations blocked
    allowed: [
      'search_products',
      'get_top_products',
      'get_orders_list',
      'search_orders',
      'search_cheques',
      'get_due_soon_cheques',
      'get_customer_detail'
    ],
    // Data scoping: queries must be filtered to this user's own customer record
    customerScoped: true
  }
};

/**
 * Returns true if the given role may call toolName.
 * @param {string} toolName
 * @param {string} role
 * @param {boolean} isMutation
 */
function isToolAllowed(toolName, role, isMutation) {
  if (!role || role === 'super_admin' || role === 'admin') return true;

  if (role === 'customer') {
    if (isMutation) return false;
    return (TOOL_ACCESS.customer.allowed || []).includes(toolName);
  }

  const access = TOOL_ACCESS[role] || TOOL_ACCESS.user;
  return !(access.denied || []).includes(toolName);
}

// Sorgu araçlarının gerektirdiği veritabanı izni (role_permissions). Arayüz ve REST API bu izinlere
// bakar; yapay zekâ da aynısına bakmalı, yoksa menüde gizli veri sohbetten sorulabilir
// (operatör "tedarikçileri listele" deyip suppliers.view olmadan liste alabiliyordu).
const QUERY_TOOL_PERMISSIONS = {
  get_dashboard_summary: 'reports.view',
  get_financial_summary: 'reports.view',
  get_monthly_comparison: 'reports.view',
  get_orders_summary: 'orders.view',
  get_orders_list: 'orders.view',
  search_orders: 'orders.view',
  search_products: 'products.view',
  get_low_stock_products: 'products.view',
  get_inventory_value: 'products.view',
  get_top_products: 'products.view',
  recommend_reorder: 'products.view',
  calculate_quote: 'products.view',
  search_customers: 'customers.view',
  get_customer_detail: 'customers.view',
  get_top_customers: 'customers.view',
  search_cheques: 'cheques.view',
  get_overdue_cheques: 'cheques.view',
  get_due_soon_cheques: 'cheques.view',
  get_debt_aging_report: 'cheques.view',
  get_payment_risk_assessment: 'cheques.view',
  get_suppliers_list: 'suppliers.view',
  get_invoices_summary: 'invoices.view',
  get_warehouse_stock: 'warehouses.view'
};

const getQueryPermission = (toolName) => QUERY_TOOL_PERMISSIONS[toolName] || null;

module.exports = { isToolAllowed, TOOL_ACCESS, QUERY_TOOL_PERMISSIONS, getQueryPermission };
