"use client";

import { useState } from "react";
import {
  GraduationCap,
  User,
  HeartPulse,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicApplyWizardProps, PublicApplyFormData } from "./public-apply-wizard.types";

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

const RELATIONSHIP_OPTIONS = ["Mother", "Father", "Legal Guardian", "Step-Parent", "Other"];

export function PublicApplyWizard({
  onSubmit,
  isSubmitting = false,
  error = null,
  initialSchoolCode = "MLA-2026",
}: PublicApplyWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<PublicApplyFormData>({
    first_name: "",
    last_name: "",
    dob: "",
    grade: "Grade 1",
    desired_start_date: "2026-09-01",
    previous_school: "",
    comments: "",
    parent_name: "",
    parent_email: "",
    parent_phone: "",
    parent_relationship: "Mother",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "Father",
    medical_consent: true,
    dietary_requirements: "",
    password: "",
    confirm_password: "",
    school_code: initialSchoolCode,
  });

  const updateField = (field: keyof PublicApplyFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = (): boolean => {
    setStepError(null);
    if (currentStep === 1) {
      if (!formData.first_name.trim()) {
        setStepError("Please enter student's first name.");
        return false;
      }
      if (!formData.last_name.trim()) {
        setStepError("Please enter student's last name.");
        return false;
      }
      if (!formData.dob) {
        setStepError("Please select student's date of birth.");
        return false;
      }
      if (!formData.grade) {
        setStepError("Please select grade applying for.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.parent_name.trim()) {
        setStepError("Please enter parent/guardian name.");
        return false;
      }
      if (!formData.parent_email.trim() || !formData.parent_email.includes("@")) {
        setStepError("Please enter a valid email address.");
        return false;
      }
      if (!formData.parent_phone.trim() || formData.parent_phone.length < 7) {
        setStepError("Please enter a valid phone number.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.emergency_contact_name.trim()) {
        setStepError("Please enter an emergency contact name.");
        return false;
      }
      if (!formData.emergency_contact_phone.trim()) {
        setStepError("Please enter an emergency contact phone.");
        return false;
      }
      if (!formData.medical_consent) {
        setStepError("Emergency medical treatment consent is required to proceed.");
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.password || formData.password.length < 8) {
        setStepError("Password must be at least 8 characters long.");
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        setStepError("Passwords do not match.");
        return false;
      }
      if (!formData.school_code.trim()) {
        setStepError("School code is required.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => (Math.min(prev + 1, 4) as 1 | 2 | 3 | 4));
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3 | 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stepper Header */}
      <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-bold text-xs uppercase tracking-wider">
            Admissions Open 2026–2027
          </span>
          <h2 className="text-2xl font-bold text-on-surface mt-2 tracking-tight">
            Student Application & Parent Portal Setup
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Complete the 4 steps below to register your family and submit your child&apos;s admissions file.
          </p>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, title: "Student Profile", icon: GraduationCap },
            { step: 2, title: "Parent / Guardian", icon: User },
            { step: 3, title: "Medical & Emergency", icon: HeartPulse },
            { step: 4, title: "Portal Account", icon: Lock },
          ].map((s) => {
            const StepIcon = s.icon;
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            return (
              <div
                key={s.step}
                className={`p-3 rounded-2xl border text-center transition ${
                  isCurrent
                    ? "bg-pastel-peach/30 border-pastel-peach-deep text-pastel-peach-deep shadow-xs"
                    : isCompleted
                    ? "bg-pastel-mint/20 border-pastel-mint-deep text-pastel-mint-deep"
                    : "bg-surface-container-low border-border/70 text-on-surface-variant"
                }`}
              >
                <div className="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 bg-surface-container-lowest">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-pastel-mint-deep" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <p className="text-[11px] font-semibold hidden sm:block">{s.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {(error || stepError) && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || stepError}</span>
        </div>
      )}

      {/* Step Form Body */}
      <div className="p-8 rounded-3xl bg-surface-container-lowest border border-border shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Student Profile */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-pastel-peach-deep" />
                Step 1: Student Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    First Name <span className="text-error">*</span>
                  </label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="e.g. Maya"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Last Name <span className="text-error">*</span>
                  </label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="e.g. Lin-Vance"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Date of Birth <span className="text-error">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Grade Applying For <span className="text-error">*</span>
                  </label>
                  <Select
                    value={formData.grade}
                    onValueChange={(val) => updateField("grade", val)}
                  >
                    <SelectTrigger className="bg-surface border-border text-on-surface">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Desired Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.desired_start_date}
                    onChange={(e) => updateField("desired_start_date", e.target.value)}
                    className="bg-surface border-border text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Previous School / Daycare (Optional)
                  </label>
                  <Input
                    value={formData.previous_school || ""}
                    onChange={(e) => updateField("previous_school", e.target.value)}
                    placeholder="e.g. Sunshine Early Learning"
                    className="bg-surface border-border text-on-surface"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Parent / Guardian */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <User className="w-5 h-5 text-pastel-peach-deep" />
                Step 2: Parent / Guardian Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Parent / Guardian Full Name <span className="text-error">*</span>
                  </label>
                  <Input
                    value={formData.parent_name}
                    onChange={(e) => updateField("parent_name", e.target.value)}
                    placeholder="e.g. Elena Lin"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Relationship to Student <span className="text-error">*</span>
                  </label>
                  <Select
                    value={formData.parent_relationship}
                    onValueChange={(val) => updateField("parent_relationship", val)}
                  >
                    <SelectTrigger className="bg-surface border-border text-on-surface">
                      <SelectValue placeholder="Relationship" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-lowest border-border text-on-surface">
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Email Address (Used for Portal Sign-in) <span className="text-error">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => updateField("parent_email", e.target.value)}
                    placeholder="elena.lin@example.com"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Primary Mobile Phone <span className="text-error">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => updateField("parent_phone", e.target.value)}
                    placeholder="(555) 482-9011"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Residential Address (Optional)
                </label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="123 Orchard Grove Way, Toronto, ON"
                  className="bg-surface border-border text-on-surface"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Medical & Emergency */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-pastel-peach-deep" />
                Step 3: Safeguarding, Medical & Emergency Contact
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Secondary Emergency Contact Name <span className="text-error">*</span>
                  </label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    placeholder="e.g. David Vance"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Emergency Phone Number <span className="text-error">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
                    placeholder="(555) 482-9012"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Dietary Restrictions, Allergies, or Medical Conditions (Optional)
                </label>
                <textarea
                  value={formData.dietary_requirements || ""}
                  onChange={(e) => updateField("dietary_requirements", e.target.value)}
                  placeholder="Please list any severe allergies, asthma, dietary restrictions, or regular medications..."
                  rows={2}
                  className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-on-surface placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Mandatory Medical Consent */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-border space-y-2">
                <div className="flex items-start space-x-2.5">
                  <Checkbox
                    id="consent-check"
                    checked={formData.medical_consent}
                    onCheckedChange={(checked) =>
                      updateField("medical_consent", Boolean(checked))
                    }
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="consent-check"
                    className="text-xs text-on-surface-variant leading-relaxed cursor-pointer"
                  >
                    <span className="font-semibold text-on-surface">Emergency Medical Treatment Consent (BR-01-03):</span>{" "}
                    I authorize Maple Leaf Academy and designated medical staff to administer first aid and secure emergency medical treatment for my child if required.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Portal Account Setup & Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Lock className="w-5 h-5 text-pastel-peach-deep" />
                Step 4: Create Parent Portal Account & Submit
              </h3>
              <p className="text-xs text-on-surface-variant">
                Set a secure password so you can sign in anytime to track your admissions progress, view fee schedules, and communicate with the school.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Password (Min. 8 characters) <span className="text-error">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="••••••••"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Confirm Password <span className="text-error">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => updateField("confirm_password", e.target.value)}
                    placeholder="••••••••"
                    className="bg-surface border-border text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  School Admissions Code <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.school_code}
                  onChange={(e) => updateField("school_code", e.target.value)}
                  placeholder="e.g. MLA-2026"
                  className="bg-surface border-border text-on-surface font-mono"
                  required
                />
              </div>

              {/* Review Snapshot */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-border/80 space-y-2 text-xs">
                <h4 className="font-bold text-on-surface">Application Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-on-surface-variant">
                  <div>
                    <span className="font-semibold text-on-surface">Student:</span>{" "}
                    {formData.first_name} {formData.last_name}
                  </div>
                  <div>
                    <span className="font-semibold text-on-surface">Grade:</span> {formData.grade}
                  </div>
                  <div>
                    <span className="font-semibold text-on-surface">Parent:</span>{" "}
                    {formData.parent_name}
                  </div>
                  <div>
                    <span className="font-semibold text-on-surface">Email:</span>{" "}
                    {formData.parent_email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="border-border text-on-surface hover:bg-surface-container text-xs px-4 py-2 rounded-full flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-primary text-on-primary hover:bg-primary/90 text-xs px-5 py-2.5 rounded-full font-semibold flex items-center gap-1.5 shadow-xs"
              >
                Continue to Step {currentStep + 1} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-pastel-peach-deep hover:bg-pastel-peach-deep/90 text-white text-xs px-6 py-2.5 rounded-full font-bold shadow-sm"
              >
                {isSubmitting ? "Submitting Application..." : "Submit Application & Register"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
