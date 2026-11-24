export function erasedUserLabel(userId: number): string {
  return `Erased user #${userId}`;
}

/** Deterministic unique placeholders that release real email/username for re-registration. */
export function erasedUserPlaceholders(userId: number) {
  return {
    username: `erased_user_${userId}`,
    firstName: 'Erased',
    lastName: `User ${userId}`,
    email: `erased-${userId}@invalid.local`,
    phone: null as string | null,
    address: null as string | null,
    image: null as string | null,
    nationalId: null as string | null,
  };
}