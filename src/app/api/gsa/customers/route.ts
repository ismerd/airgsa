import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { canManageWorkflow } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import {
  assignGsaCustomer,
  canAssignGsaCustomers,
  getCustomerKey,
  listGsaCustomerAssignments,
} from "@/lib/services/gsa-customer-assignment-store";
import { listMandateBookings, listMandateQuotes, type MandateBooking, type MandateQuote } from "@/lib/services/mandate-execution-store";
import { listTeamAccounts } from "@/lib/services/team-accounts";

const CUSTOMER_ASSIGNMENT_BODY_LIMIT_BYTES = 12 * 1024;

type CustomerPriority = "high" | "medium" | "watch";

type CustomerPortfolioRow = {
  id: string;
  customerKey: string;
  name: string;
  contactPerson: string;
  email: string;
  origin: string;
  destination: string;
  priority: CustomerPriority;
  monthlyVolume: number;
  monthlyRevenue: number;
  yieldGap: number;
  lastContact: string;
  awbNumber?: string;
  shipmentStatus?: string;
  pendingInquiries: number;
  openQuotes: number;
  assignedToEmail?: string;
  assignedToName?: string;
};

type CustomerAssignmentBody = {
  customerKey?: string;
  customerName?: string;
  contactEmail?: string;
  assignedToEmail?: string;
  assignedToName?: string;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `gsa-customers:${session.companyId ?? session.company}:${session.email}:${getClientIp(request)}`,
    limit: 160,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const canAssign = canAssignGsaCustomers(session);
  const [quotes, bookings, assignments, team] = await Promise.all([
    listMandateQuotes(session),
    listMandateBookings(session),
    listGsaCustomerAssignments(session),
    canAssign ? listTeamAccounts(session.company, "gsa", session.companyId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    customers: buildCustomerPortfolio(quotes, bookings, assignments),
    assignments,
    team: team.filter((member) => member.status === "active"),
    canAssign,
    currentUser: {
      email: session.email,
      name: session.name,
      accessRole: session.accessRole,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  if (!canManageWorkflow(session)) return NextResponse.json({ error: "Only team leads and admins can assign customers." }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `gsa-customer-assign:${session.companyId ?? session.company}:${session.email}:${getClientIp(request)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: CustomerAssignmentBody;
  try {
    body = await readJsonWithLimit<CustomerAssignmentBody>(request, CUSTOMER_ASSIGNMENT_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.customerKey || !body.customerName || !body.contactEmail) {
    return NextResponse.json({ error: "Customer, contact email and customer key are required." }, { status: 400 });
  }

  const team = await listTeamAccounts(session.company, "gsa", session.companyId);
  const assignedTo = body.assignedToEmail
    ? team.find((member) => member.email.toLowerCase() === body.assignedToEmail?.toLowerCase() && member.status === "active")
    : null;
  if (body.assignedToEmail && !assignedTo) return NextResponse.json({ error: "Assigned employee is not active in this GSA team." }, { status: 400 });

  const assignment = await assignGsaCustomer(session, {
    customerKey: body.customerKey,
    customerName: body.customerName,
    contactEmail: body.contactEmail,
    assignedToEmail: assignedTo?.email,
    assignedToName: assignedTo?.name,
  });
  return NextResponse.json({ assignment });
}

function buildCustomerPortfolio(
  quotes: MandateQuote[],
  bookings: MandateBooking[],
  assignments: Awaited<ReturnType<typeof listGsaCustomerAssignments>>,
): CustomerPortfolioRow[] {
  const assignmentByCustomer = new Map(assignments.map((assignment) => [assignment.customerKey, assignment]));
  const rows = new Map<string, CustomerPortfolioRow & { yieldKg: number }>();
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);
  const totalWeight = bookings.reduce((sum, booking) => sum + booking.weightKg, 0);
  const averageYield = totalWeight > 0 ? totalRevenue / totalWeight : 0;

  function upsert(base: {
    customer: string;
    contactName: string;
    contactEmail: string;
    origin: string;
    destination: string;
    updatedAt: string;
  }) {
    const customerKey = getCustomerKey(base.customer, base.contactEmail);
    const assignment = assignmentByCustomer.get(customerKey);
    const existing = rows.get(customerKey);
    if (existing) {
      if (new Date(base.updatedAt).getTime() > new Date(existing.lastContact).getTime()) {
        existing.origin = base.origin;
        existing.destination = base.destination;
        existing.lastContact = base.updatedAt;
      }
      return existing;
    }
    const row: CustomerPortfolioRow & { yieldKg: number } = {
      id: customerKey,
      customerKey,
      name: base.customer,
      contactPerson: base.contactName || "Contact not provided",
      email: base.contactEmail || "No email on file",
      origin: base.origin,
      destination: base.destination,
      priority: "watch",
      monthlyVolume: 0,
      monthlyRevenue: 0,
      yieldGap: 0,
      yieldKg: 0,
      lastContact: base.updatedAt,
      pendingInquiries: 0,
      openQuotes: 0,
      assignedToEmail: assignment?.assignedToEmail,
      assignedToName: assignment?.assignedToName,
    };
    rows.set(customerKey, row);
    return row;
  }

  for (const quote of quotes) {
    const row = upsert({
      customer: quote.customer,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      origin: quote.origin,
      destination: quote.destination,
      updatedAt: quote.updatedAt,
    });
    if (quote.status === "airline-approval-required") row.pendingInquiries += 1;
    if (quote.status !== "airline-rejected" && quote.status !== "declined" && quote.status !== "expired") row.openQuotes += 1;
  }

  for (const booking of bookings) {
    const row = upsert({
      customer: booking.customer,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      origin: booking.origin,
      destination: booking.destination,
      updatedAt: booking.updatedAt,
    });
    row.monthlyVolume += booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    row.monthlyRevenue += booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    row.awbNumber = booking.awbNumber;
    row.shipmentStatus = booking.status;
  }

  return Array.from(rows.values())
    .map((row) => {
      const customerYield = row.monthlyVolume > 0 ? row.monthlyRevenue / row.monthlyVolume : 0;
      const yieldGap = averageYield > 0 && customerYield > 0 ? ((customerYield - averageYield) / averageYield) * 100 : 0;
      const priority: CustomerPriority = row.pendingInquiries > 0 || row.shipmentStatus === "booked"
        ? "high"
        : row.openQuotes > 0 || row.monthlyRevenue > 0
          ? "medium"
          : "watch";
      return { ...row, priority, yieldGap };
    })
    .sort((left, right) => {
      const priorityRank = { high: 0, medium: 1, watch: 2 };
      return priorityRank[left.priority] - priorityRank[right.priority] || right.monthlyRevenue - left.monthlyRevenue;
    });
}
