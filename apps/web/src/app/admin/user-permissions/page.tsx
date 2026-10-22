import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Permissões por usuário · Administração · Helpdesk',
  description: 'Exceções de acesso concedidas ou negadas diretamente por usuário',
};

export default async function UserPermissionsPage() {
  redirect('/administracao/permissoes');
}
