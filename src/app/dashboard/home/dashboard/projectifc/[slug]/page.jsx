'use client';
import { useParams } from 'next/navigation';
import ProjectIFCProgressChart from '../../../../../components/HomeComponent/dashboard/ProjectIFCProgressChart';

export default function ProjectIfcChartPage() {
  const { slug } = useParams();

  return (
   <ProjectIFCProgressChart />
  );
}
