/** Matriz de permissões — espelha RLS; a decisão final está no backend/RLS. */

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type CompanyRole = "owner" | "operator" | "viewer";

export type Permission =
  | "org.manage"
  | "org.members.manage"
  | "org.certificates.manage"
  | "company.create"
  | "company.update"
  | "company.delete"
  | "company.access.manage"
  | "company.read"
  | "operations.write"
  | "operations.read";

const ORG_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "org.manage",
    "org.members.manage",
    "org.certificates.manage",
    "company.create",
    "company.update",
    "company.delete",
    "company.access.manage",
    "company.read",
    "operations.write",
    "operations.read",
  ],
  admin: [
    "org.manage",
    "org.members.manage",
    "org.certificates.manage",
    "company.create",
    "company.update",
    "company.delete",
    "company.access.manage",
    "company.read",
    "operations.write",
    "operations.read",
  ],
  member: ["company.read", "operations.write", "operations.read"],
  viewer: ["company.read", "operations.read"],
};

const COMPANY_PERMISSIONS: Record<CompanyRole, Permission[]> = {
  owner: [
    "company.update",
    "company.access.manage",
    "company.read",
    "operations.write",
    "operations.read",
  ],
  operator: ["company.update", "company.read", "operations.write", "operations.read"],
  viewer: ["company.read", "operations.read"],
};

export function labelOrgRole(role: OrgRole | null | undefined): string {
  switch (role) {
    case "owner":
      return "Proprietário";
    case "admin":
      return "Administrador";
    case "member":
      return "Membro";
    case "viewer":
      return "Visualizador";
    default:
      return "Sem organização";
  }
}

export function hasOrgPermission(
  orgRole: OrgRole | null | undefined,
  permission: Permission,
): boolean {
  if (!orgRole) return false;
  return ORG_PERMISSIONS[orgRole].includes(permission);
}

export function hasCompanyPermission(
  orgRole: OrgRole | null | undefined,
  companyRole: CompanyRole | null | undefined,
  permission: Permission,
): boolean {
  if (orgRole && (orgRole === "owner" || orgRole === "admin")) {
    return hasOrgPermission(orgRole, permission);
  }
  if (!companyRole) return false;
  return COMPANY_PERMISSIONS[companyRole].includes(permission);
}
