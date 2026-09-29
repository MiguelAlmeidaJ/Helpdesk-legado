export type AppButtonVariant = 'primary' | 'secondary' | 'danger';
export type AppButtonSize = 'default' | 'sm';

export function appButtonClass(
  variant: AppButtonVariant = 'secondary',
  size: AppButtonSize = 'default',
  extra = '',
): string {
  return [
    'app-button',
    `app-button--${variant}`,
    size === 'sm' ? 'app-button--sm' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
