import { type Role } from "@prisma/client";

const roleHierarchy: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
  CLIENT: 0,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function requireRole(userRole: Role | undefined, requiredRole: Role): void {
  if (!userRole || !hasRole(userRole, requiredRole)) {
    throw new Error("Insufficient permissions");
  }
}
