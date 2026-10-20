import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('childSafety', '/child-safety');

export default function Page() {
  return <ContentPage pageKey="childSafety" />;
}
