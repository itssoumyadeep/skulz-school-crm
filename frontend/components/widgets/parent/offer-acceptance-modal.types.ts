export type OfferAcceptanceModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (photo: File) => Promise<void> | void;
  childName: string;
  grade: string;
  applicationId: string;
  isSubmitting?: boolean;
  error?: string | null;
};
