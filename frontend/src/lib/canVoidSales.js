const getBusinessId = (business) => business?.business_id ?? business?.id ?? null;

const getRoleFromBusiness = (business) => {
  if (!business || typeof business !== 'object') return null;
  return business?.pivot?.role || business?.role || null;
};

const getRoleFromUserContext = (userContext, activeBusinessId) => {
  if (!userContext || typeof userContext !== 'object') return null;

  if (userContext.activeBusinessRole) {
    return userContext.activeBusinessRole;
  }

  const contextBusinesses = Array.isArray(userContext.businesses) ? userContext.businesses : [];
  const matchedBusiness = contextBusinesses.find((business) => String(getBusinessId(business)) === String(activeBusinessId));
  return getRoleFromBusiness(matchedBusiness);
};

export const canVoidSales = (currentBusiness, businesses = [], userContext = null) => {
  const activeBusinessId = getBusinessId(currentBusiness);
  if (!activeBusinessId) return false;

  const roleFromContext = getRoleFromUserContext(userContext, activeBusinessId);
  if (roleFromContext) {
    return roleFromContext === 'admin';
  }

  const roleFromCurrentBusiness = getRoleFromBusiness(currentBusiness);
  if (roleFromCurrentBusiness) {
    return roleFromCurrentBusiness === 'admin';
  }

  const matchedBusiness = (Array.isArray(businesses) ? businesses : []).find(
    (business) => String(getBusinessId(business)) === String(activeBusinessId)
  );
  return getRoleFromBusiness(matchedBusiness) === 'admin';
};

