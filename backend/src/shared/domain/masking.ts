/**
 * Masks personal data before it leaves the API, so a leaked id does not
 * expose a customer's full email or phone number.
 */
export const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.charAt(0)}***@${domain}`;
};

export const maskPhone = (phone: string): string =>
  phone.length <= 4
    ? '****'
    : `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
