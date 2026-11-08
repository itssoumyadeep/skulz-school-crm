"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Upload, AlertCircle, Image as ImageIcon } from "lucide-react";
import type { OfferAcceptanceModalProps } from "./offer-acceptance-modal.types";

export function OfferAcceptanceModal({
  open,
  onClose,
  onConfirm,
  childName,
  grade,
  applicationId,
  isSubmitting = false,
  error = null,
}: OfferAcceptanceModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setValidationError("Please select a valid image file (JPEG, PNG).");
        return;
      }
      setPhoto(file);
      setValidationError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!photo) {
      setValidationError("Please upload a student passport-style photo to complete enrollment.");
      return;
    }
    if (!agreedToTerms) {
      setValidationError("Please accept the admission and code-of-conduct terms.");
      return;
    }

    await onConfirm(photo);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && !val && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-lowest border-border text-on-surface">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-pastel-mint/30 text-pastel-mint-deep flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-pastel-mint-deep" />
            </div>
            <DialogTitle className="text-xl font-bold text-on-surface">
              Accept Admissions Offer
            </DialogTitle>
          </div>
          <p className="text-sm text-on-surface-variant">
            Congratulations! Official offer of admission extended to{" "}
            <span className="font-semibold text-on-surface">{childName}</span> for{" "}
            <span className="font-semibold text-on-surface">{grade}</span>.
          </p>
        </DialogHeader>

        {(error || validationError) && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Offer Summary Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Application ID:</span>
              <span className="font-mono font-semibold text-on-surface">{applicationId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Academic Year:</span>
              <span className="font-semibold text-on-surface">2026–2027</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-semibold text-[11px]">
                Offer Ready
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Next Step:</span>
              <span className="text-on-surface font-medium">Initial Enrollment Deposit Invoice will be issued upon acceptance.</span>
            </div>
          </div>

          {/* Mandatory Student Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-pastel-peach-deep" />
              Student Identification Photo (Required for Student ID & Profile)
            </label>
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-surface-container-low transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {photoPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={photoPreview}
                    alt="Student Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-pastel-mint-deep shadow-sm"
                  />
                  <p className="text-xs text-on-surface font-medium">{photo?.name}</p>
                  <p className="text-[11px] text-pastel-mint-deep">Click or drag to change photo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-on-surface-variant">
                  <Upload className="w-8 h-8 text-muted" />
                  <p className="text-xs font-medium text-on-surface">
                    Upload recent passport-style photo
                  </p>
                  <p className="text-[11px] text-muted">PNG or JPG up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Code of Conduct Checkbox */}
          <div className="p-3 rounded-xl border border-border bg-surface-container-low/40 space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="accept-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(Boolean(checked))}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <label
                htmlFor="accept-terms"
                className="text-xs text-on-surface-variant leading-relaxed cursor-pointer"
              >
                I confirm acceptance of the admission offer for {childName}. I understand that school policies, code of conduct, and tuition fee schedules apply for the academic session.
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-border text-on-surface hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-pastel-mint-deep text-white hover:bg-pastel-mint-deep/90 font-semibold shadow-sm"
            >
              {isSubmitting ? "Accepting Offer..." : "Confirm & Accept Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
