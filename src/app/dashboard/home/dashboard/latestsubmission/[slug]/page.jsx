'use client';
import { useParams } from 'next/navigation';

export default function LatestSubmissionPage() {
  const { slug } = useParams();

  return (
  <div>latest submission page</div>
  );
}
