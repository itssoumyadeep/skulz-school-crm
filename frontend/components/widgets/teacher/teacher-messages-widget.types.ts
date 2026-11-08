import type { WidgetBaseProps } from "../index";

export interface TeacherMessageLogItem {
  messageId: string;
  recipientLabel: string;
  recipientRole: string;
  channel: "In_App" | "Email" | "SMS" | string;
  subject: string;
  body: string;
  sentAtLabel: string;
  statusLabel: string;
}

export interface TeacherExcursionWaiverCard {
  eventId: string;
  title: string;
  eventDate: string;
  registrationDeadline: string;
  location: string;
  signedCount: number;
  totalCount: number;
  feeAmount: number;
  requiresPermissionSlip: boolean;
}

export interface TeacherMessagesWidgetData {
  homeroomLabel: string;
  messages: TeacherMessageLogItem[];
  excursions: TeacherExcursionWaiverCard[];
  parentAckRatePct: number;
}

export interface TeacherMessagesWidgetCapabilities {
  [key: string]: boolean;
  canComposeMessage: boolean;
  canSendExcursionReminder: boolean;
}

export interface TeacherMessagesWidgetProps
  extends WidgetBaseProps<
    TeacherMessagesWidgetData,
    TeacherMessagesWidgetCapabilities
  > {
  onOpenComposeModal?: (prefill?: {
    subject?: string;
    body?: string;
  }) => void;
  onSendExcursionReminder?: (excursion: TeacherExcursionWaiverCard) => void;
}
