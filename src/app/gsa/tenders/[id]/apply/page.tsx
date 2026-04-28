import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ApplyTenderPage() {
  return (
    <>
      <Topbar title="Apply to tender" subtitle="GSA application" />
      <main className="p-5">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Commercial proposal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Proposed commission" defaultValue="5.8% base + 1.2% accelerator" />
            <Input placeholder="Launch timeline" defaultValue="90 days" />
            <Input placeholder="Named account coverage" defaultValue="84 active shipper relationships" />
            <Input placeholder="Monthly sales target" defaultValue="$1.4M" />
            <Textarea className="md:col-span-2" placeholder="Network plan" defaultValue="Dedicated DACH pharma and express desk with named key account owners for FRA, MUC, and VIE origin traffic." />
            <Textarea className="md:col-span-2" placeholder="Operational readiness" defaultValue="GDP-certified process, CASS settlement experience, airline handover checklist, and 24/7 booking escalation coverage." />
            <Button className="md:col-span-2">Submit mock application</Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

