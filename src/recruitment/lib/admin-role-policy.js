export const ADMIN_ROLES = [
  'super_admin',
  'recruitment_admin',
  'assessment_evaluator',
  'project_evaluator',
  'interviewer',
];

/** @param {unknown} role @param {readonly string[]} allowedRoles */
export function hasAdminRole(role, allowedRoles) {
  return typeof role === 'string' && allowedRoles.includes(role);
}
