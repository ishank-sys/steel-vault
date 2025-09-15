'use client';
import { useParams } from 'next/navigation';
import MasterDownload from '../../../../../components/HomeComponent/dashboard/MasterDownload';

export default function ProjectDataFolderPage() {
  const { slug } = useParams();

  return (
   <MasterDownload/>
  );
}
