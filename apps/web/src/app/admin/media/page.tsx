import { AppPermission } from '@helpdesk/contracts';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { MediaAdminScreen } from '../../../modules/media/components/media-admin-screen';
export const metadata={title:'Central de Mídias · Helpdesk'};
export default async function MediaPage(){
  const currentUser=await requireAuthenticatedUser('/administracao/midias');
  if(!currentUser.grants.some(grant=>grant.permission===AppPermission.SystemAdmin))redirect('/painel');
  return <MediaAdminScreen currentUser={currentUser}/>;
}
