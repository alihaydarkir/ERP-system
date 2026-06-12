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
      'get_debt_aging_report'
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

module.exports = { isToolAllowed, TOOL_ACCESS };
