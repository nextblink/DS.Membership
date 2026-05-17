export const auth = {
  isAuthenticated: () => !!sessionStorage.getItem('access_token'),
  getToken: () => sessionStorage.getItem('access_token'),
  getMemberId: () => {
    const id = sessionStorage.getItem('user_id');
    return id ? parseInt(id, 10) : null;
  },
  getDisplayName: () => sessionStorage.getItem('user_name') ?? '',
  getFunctionIds: () => {
    const raw = sessionStorage.getItem('function_ids');
    return raw ? JSON.parse(raw) : [];
  },
  store: ({ token, memberId, displayName, committeeId, functionIds }) => {
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('user_id', String(memberId));
    sessionStorage.setItem('user_name', displayName);
    sessionStorage.setItem('committee_id', String(committeeId));
    sessionStorage.setItem('function_ids', JSON.stringify(functionIds));
  },
  clear: () => sessionStorage.clear(),
};
