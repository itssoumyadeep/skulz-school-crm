export interface BroadcastRecipientOption {
  id: string;
  label: string;
  role: "Parent" | "Teacher" | "Staff";
  subtitle?: string;
}

export interface BroadcastComposerSubmitPayload {
  recipientId?: string;
  recipientRole: "Parent" | "Teacher" | "Staff";
  channel: "In_App" | "Email" | "SMS";
  subject: string;
  body: string;
  isEmergencyBroadcast: boolean;
}

export interface BroadcastComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: BroadcastRecipientOption[];
  defaultRecipientId?: string;
  defaultSubject?: string;
  defaultBody?: string;
  canSendEmergencyBroadcast?: boolean;
  isSubmitting?: boolean;
  onSubmitBroadcast: (
    payload: BroadcastComposerSubmitPayload,
  ) => Promise<void> | void;
}
