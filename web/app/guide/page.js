import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('guide', '/guide');

export default function Page() {
  return <ContentPage pageKey="guide" />;
}
