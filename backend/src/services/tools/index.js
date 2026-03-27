const queryTools = require('./queryTools');
const mutationTools = require('./mutationTools');
const {
  DEFAULT_MUTATION_PERMISSION_MAP,
  definitions,
  isMutationTool,
  sanitizeToolArgs,
  validateToolArgs
} = require('./toolSchemas');

const tools = {
  ...queryTools,
  ...mutationTools,
  definitions,
  isMutationTool,
  sanitizeToolArgs,
  validateToolArgs,

  async execute(toolName, args, contextOrCompanyId) {
    const context = typeof contextOrCompanyId === 'object'
      ? contextOrCompanyId
      : { company_id: contextOrCompanyId };

    const fn = this[toolName];
    if (!fn || typeof fn !== 'function') {
      throw new Error(`Bilinmeyen araç: ${toolName}`);
    }

    const { valid, sanitizedArgs, error } = this.validateToolArgs(toolName, args || {});
    if (!valid) {
      throw new Error(`Geçersiz araç parametresi: ${error}`);
    }

    if (this.isMutationTool(toolName)) {
      const permissionMap = context.mutationPermissionMap || DEFAULT_MUTATION_PERMISSION_MAP;
      const requiredPermission = permissionMap[toolName];

      if (!requiredPermission) {
        throw new Error(`Permission mapping bulunamadı: ${toolName}`);
      }

      if (typeof context.hasMutationPermission !== 'function') {
        throw new Error(`Mutation permission checker bulunamadı: ${toolName}`);
      }

      const permissionResult = await context.hasMutationPermission({
        user_id: context.user_id,
        role: context.role,
        toolName,
        requiredPermission
      });

      if (!permissionResult?.allowed) {
        throw new Error(`Permission denied: ${permissionResult?.requiredPermission || requiredPermission}`);
      }
    }

    return await fn.call(this, {
      ...sanitizedArgs,
      company_id: context.company_id,
      user_id: context.user_id,
      role: context.role
    });
  }
};

module.exports = tools;
