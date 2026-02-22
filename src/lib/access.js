// Role-based access control for The Hauss
// Tiers: writer (free) < editor (paid) < publisher (premium) < admin

const TIER_LEVEL = {
  writer: 0,
  editor: 1,
  publisher: 2,
  admin: 3,
};

export function getEffectiveRole(role, isTester) {
  if (isTester) return "publisher";
  return role || "writer";
}

export function hasAccess(role, isTester, requiredTier) {
  const effective = getEffectiveRole(role, isTester);
  return (TIER_LEVEL[effective] ?? 0) >= (TIER_LEVEL[requiredTier] ?? 0);
}

export const ROLE_LABELS = {
  admin: "Admin",
  writer: "Writer",
  editor: "Editor",
  publisher: "Publisher",
};

export const ROLE_BADGE_STYLES = {
  admin: { backgroundColor: "#121212", color: "#fff" },
  writer: { backgroundColor: "transparent", border: "1px solid #e2e2e2", color: "#727272" },
  editor: { backgroundColor: "#c41e1e", color: "#fff" },
  publisher: { backgroundColor: "#b8860b", color: "#fff" },
};
