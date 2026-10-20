import ContentPage, { contentMetadata } from '@/components/ContentPage';

export const generateMetadata = () => contentMetadata('refund', '/refund-policy');

export default function Page() {
  return <ContentPage pageKey="refund" />;
}
