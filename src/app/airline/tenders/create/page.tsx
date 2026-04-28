import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CreateTenderPage() {
  return (
    <>
      <Topbar title="Create tender" subtitle="Airline tender desk" />
      <main className="p-5">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>RFP brief</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Tender title" defaultValue="Central Europe GSA representation" />
            <Input placeholder="Expected annual tonnage" defaultValue="18400" />
            <Input placeholder="Markets" defaultValue="Germany, Austria, Switzerland" />
            <Input placeholder="Core lanes" defaultValue="FRA, MUC, VIE to DXB, DOH, SIN" />
            <Select defaultValue="open">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
            </Select>
            <Input placeholder="Deadline" defaultValue="2026-05-24" type="date" />
            <Textarea className="md:col-span-2" placeholder="Requirements" defaultValue={"GDP-certified pharma desk\n24/7 booking coverage\nMonthly route-level KPI reporting"} />
            <Textarea className="md:col-span-2" placeholder="Commercial expectations" defaultValue="Target a GSA with strong DACH key account coverage, CASS process maturity, and launch support for pharma and express shippers." />
            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
              <Button>Publish mock tender</Button>
              <Button variant="outline">Save draft</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

