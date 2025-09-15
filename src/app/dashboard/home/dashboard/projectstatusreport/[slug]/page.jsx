'use client';
import { useParams } from 'next/navigation';
import ProjectStatusReport from '../../../../../components/HomeComponent/dashboard/ProjectStatusReport';

export default function ProjectStatusReportPage() {
  const { slug } = useParams();

  return (
    <ProjectStatusReport />
  );
}
