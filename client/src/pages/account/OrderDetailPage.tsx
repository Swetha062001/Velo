import { useParams } from 'react-router';
import { PagePlaceholder } from '../../components/common/PagePlaceholder.tsx';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  return (
    <PagePlaceholder
      title={`Order ${orderNumber}`}
      phase={9}
      contained={false}
      description="Items, prices at time of purchase, shipping address and status."
    />
  );
}
