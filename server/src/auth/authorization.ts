import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type CompanyRole = "owner" | "operator" | "viewer";

export type CompanyAccessContext = {
  userId: string;
  companyId: string;
  organizationId: string;
  orgRole: OrgRole | null;
  companyRole: CompanyRole | null;
  canRead: boolean;
  canWrite: boolean;
};

function isOrgAdmin(role: OrgRole | null): boolean {
  return role === "owner" || role === "admin";
}

export async function resolveCompanyAccess(
  pool: Pool,
  userId: string,
  companyId: string,
): Promise<CompanyAccessContext> {
  const { rows } = await pool.query<{
    organization_id: string;
    org_role: OrgRole | null;
    company_role: CompanyRole | null;
  }>(
    `SELECT
       c.organization_id,
       (
         SELECT m.role
         FROM organization_members m
         WHERE m.organization_id = c.organization_id
           AND m.user_id = $1
         LIMIT 1
       ) AS org_role,
       (
         SELECT a.role
         FROM company_access a
         WHERE a.company_id = c.id
           AND a.user_id = $1
         LIMIT 1
       ) AS company_role
     FROM companies c
     WHERE c.id = $2`,
    [userId, companyId],
  );

  if (rows.length === 0) {
    throw new AppError("Empresa não encontrada.", "NOT_FOUND", 404);
  }

  const row = rows[0];
  const orgRole = row.org_role;
  const companyRole = row.company_role;
  const canRead = isOrgAdmin(orgRole) || companyRole !== null;
  const canWrite =
    isOrgAdmin(orgRole) || companyRole === "owner" || companyRole === "operator";

  return {
    userId,
    companyId,
    organizationId: row.organization_id,
    orgRole,
    companyRole,
    canRead,
    canWrite,
  };
}

export function assertCanReadCompany(ctx: CompanyAccessContext) {
  if (!ctx.canRead) {
    throw new AppError(
      "Sem permissão para acessar dados desta empresa.",
      "FORBIDDEN_COMPANY",
      403,
    );
  }
}

export function assertCanWriteCompany(ctx: CompanyAccessContext) {
  if (!ctx.canWrite) {
    throw new AppError(
      "Sem permissão para alterar dados desta empresa.",
      "FORBIDDEN_COMPANY",
      403,
    );
  }
}

export type OrgAdminContext = {
  userId: string;
  organizationId: string;
  orgRole: OrgRole;
};

/** Owner/admin da organização — ex.: validar certificado A1 do escritório. */
export async function resolveOrgAdmin(
  pool: Pool,
  userId: string,
  organizationId: string,
): Promise<OrgAdminContext> {
  const { rows } = await pool.query<{ role: OrgRole }>(
    `SELECT role
     FROM organization_members
     WHERE organization_id = $1 AND user_id = $2
     LIMIT 1`,
    [organizationId, userId],
  );
  const role = rows[0]?.role ?? null;
  if (!isOrgAdmin(role)) {
    throw new AppError(
      "Sem permissão administrativa nesta organização.",
      "FORBIDDEN_ORG",
      403,
    );
  }
  return { userId, organizationId, orgRole: role! };
}
