import type { WidgetBaseProps } from "@/components/widgets";

export type EventDisplayItem = {
  event_id: string;
  title: string;
  event_date: string;
  registration_deadline: string;
  location: string;
  description?: string;
  fee_amount: number;
  capacity: number;
  requires_permission_slip: boolean;
  status: string;
  is_registered?: boolean;
  permission_slip_signed?: boolean;
};

export type ParentEventsData = {
  household_name: string;
  children: Array<{
    student_id: string;
    name: string;
    grade: string;
  }>;
  events: EventDisplayItem[];
};

export type ParentEventsCapabilities = {
  canRegister: boolean;
  canSignSlips: boolean;
};

export interface ParentEventsWidgetProps
  extends WidgetBaseProps<ParentEventsData, ParentEventsCapabilities> {
  onRegisterEvent: (
    eventId: string,
    studentId: string,
    signedSlip: boolean,
  ) => Promise<void> | void;
  isRegistering?: boolean;
}
