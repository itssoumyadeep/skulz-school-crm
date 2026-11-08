"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SiblingIntakeModalProps, SiblingEnrollmentData } from "./sibling-intake-modal.types";

const GRADE_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export function SiblingIntakeModal({
  open,
  onClose,
  onSubmit,
  parentName,
  parentEmail,
  parentPhone,
  isSubmitting = false,
  error = null,
}: SiblingIntakeModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [grade, setGrade] = useState("Kindergarten");
  const [desiredStartDate, setDesiredStartDate] = useState("2026-09-01");
  const [comments, setComments] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState(parentName || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(parentPhone || "");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("Parent");
  const [medicalConsent, setMedicalConsent] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!firstName.trim()) {
      setValidationError("Please enter child's first name.");
      return;
    }
    if (!lastName.trim()) {
      setValidationError("Please enter child's last name.");
      return;
    }
    if (!dob) {
      setValidationError("Please specify child's date of birth.");
      return;
    }
    if (!grade) {
      setValidationError("Please select the grade applying for.");
      return;
    }

    const payload: SiblingEnrollmentData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      dob: dob || null,
      grade,
      desired_start_date: desiredStartDate || null,
      comments: comments.trim() || undefined,
      emergency_contact_name: emergencyContactName.trim() || undefined,
      emergency_contact_phone: emergencyContactPhone.trim() || undefined,
      emergency_contact_relationship: emergencyContactRelationship.trim() || undefined,
      medical_consent: medicalConsent,
      sibling_discount_requested: true,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && !val && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest border-border text-on-surface">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-pastel-peach/30 text-pastel-peach-deep flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl font-bold text-on-surface">
              Register Sibling Application
            </DialogTitle>
          </div>
          <p className="text-sm text-on-surface-variant">
            Submit a new admissions inquiry for another child in your family.
          </p>
        </DialogHeader>

        {/* Sibling Discount Incentive Banner */}
        <div className="p-3.5 rounded-xl bg-pastel-mint/20 border border-pastel-mint-deep/20 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-pastel-mint-deep shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-pastel-mint-deep">
              Sibling Tuition Discount Eligible (BR-02-01)
            </p>
            <p className="text-on-surface-variant mt-0.5">
              Because you already have a child enrolled at Maple Leaf Academy, this application qualifies for our multi-child 10% fee reduction upon admission.
            </p>
          </div>
        </div>

        {(error || validationError) && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Linked Parent Information Readout */}
          <div className="p-3 rounded-lg bg-surface-container-low border border-border/50 text-xs text-on-surface-variant flex items-center justify-between">
            <div>
              <span className="font-semibold text-on-surface">Primary Guardian:</span>{" "}
              {parentName || "Current Parent"} ({parentEmail || "Account Email"})
            </div>
            <span className="px-2 py-0.5 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-semibold text-[10px]">
              Family Linked
            </span>
          </div>

          {/* Child Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maya"
                disabled={isSubmitting}
                className="bg-surface border-border text-on-surface text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Lin-Vance"
                disabled={isSubmitting}
                className="bg-surface border-border text-on-surface text-sm"
                required
              />
            </div>
          </div>

          {/* Date of Birth & Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Date of Birth <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={isSubmitting}
                className="bg-surface border-border text-on-surface text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Grade Applying For <span className="text-error">*</span>
              </label>
              <Select value={grade} onValueChange={setGrade} disabled={isSubmitting}>
                <SelectTrigger className="bg-surface border-border text-on-surface text-sm">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-lowest border-border text-on-surface">
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desired Start Date */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Desired Start Date
            </label>
            <Input
              type="date"
              value={desiredStartDate}
              onChange={(e) => setDesiredStartDate(e.target.value)}
              disabled={isSubmitting}
              className="bg-surface border-border text-on-surface text-sm"
            />
          </div>

          {/* Emergency Contact */}
          <div className="p-3 rounded-lg border border-border bg-surface-container-low/50 space-y-3">
            <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-pastel-mint-deep" />
              Emergency & Medical Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Contact Name
                </label>
                <Input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Contact Name"
                  disabled={isSubmitting}
                  className="bg-surface border-border text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Relationship
                </label>
                <Input
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  placeholder="e.g. Parent"
                  disabled={isSubmitting}
                  className="bg-surface border-border text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Emergency Phone
                </label>
                <Input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  disabled={isSubmitting}
                  className="bg-surface border-border text-xs"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="medical-consent"
                checked={medicalConsent}
                onCheckedChange={(checked) => setMedicalConsent(Boolean(checked))}
                disabled={isSubmitting}
              />
              <label
                htmlFor="medical-consent"
                className="text-xs text-on-surface-variant leading-none cursor-pointer"
              >
                I grant emergency medical treatment consent for this student (BR-01-03).
              </label>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Notes or Special Requirements (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any learning accommodations, dietary needs, or interests..."
              rows={2}
              disabled={isSubmitting}
              className="w-full rounded-md border border-border bg-surface p-2 text-xs text-on-surface placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              className="bg-primary text-on-primary hover:bg-primary/90 font-semibold shadow-sm"
            >
              {isSubmitting ? "Submitting Application..." : "Submit Sibling Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
