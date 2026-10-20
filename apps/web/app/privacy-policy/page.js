import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('privacy', '/privacy-policy');

export default function Page() {
  return <ContentPage pageKey="privacy" />;
}
