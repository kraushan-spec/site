import { ContractDetailView } from "@/components/contracts/contract-detail-view";

export default async function TenderDetailPage({ params }: PageProps<"/tenders/[id]">) {
  const { id } = await params;
  return <ContractDetailView id={id} />;
}
