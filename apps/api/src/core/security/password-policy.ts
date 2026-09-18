const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 100;

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter entre 12 e 100 caracteres, com letra maiúscula, letra minúscula, número e símbolo.';
