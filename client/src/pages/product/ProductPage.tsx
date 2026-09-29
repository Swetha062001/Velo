import { useParams } from 'react-router';
import { PagePlaceholder } from '../../components/common/PagePlaceholder.tsx';

export default function ProductPage() {
  const { slug } = useParams();
  return (
    <PagePlaceholder
      title="Product details"
      phase={6}
      description={`Gallery, sizes, stock and add-to-cart for “${slug}”.`}
    />
  );
}
