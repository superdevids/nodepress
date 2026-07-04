import { InstallWizard } from '@/components/install/install-wizard';

export const metadata = {
  title: 'Install NodePress',
  description: 'NodePress installation wizard — Set up your CMS in 5 simple steps.',
};

export default function InstallPage() {
  return <InstallWizard />;
}
