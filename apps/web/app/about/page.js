import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('about', '/about');

export default function Page() {
  return <ContentPage pageKey="about" />;
}
