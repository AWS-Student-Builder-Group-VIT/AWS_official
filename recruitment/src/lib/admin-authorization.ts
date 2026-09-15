import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { ADMIN_ROLES, hasAdminRole } from './admin-role-policy.mjs';

export const ASSESSMENT_ADMIN_ROLES = ['super_admin', 'recruitment_admin', 'assessment_evaluator'];

export async function authorizeAdmin(request: Request, allowedRoles: readonly string[] = ADMIN_ROLES) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: 'Invalid session.' }, { status: 401 }) };
  }

  const { data: adminUser, error: adminError } = await admin
    .from('admin_users')
    .select('id,email,name,role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (adminError || !adminUser || !hasAdminRole(adminUser.role, allowedRoles)) {
    return { error: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }

  return { admin, adminUser, userId: authData.user.id };
}
