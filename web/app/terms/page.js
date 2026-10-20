import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('terms', '/terms');

export default function Page() {
  return <ContentPage pageKey="terms" />;
}
