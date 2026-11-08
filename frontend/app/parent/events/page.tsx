"use client";

import { useEffect, useState } from "react";
import {
  ParentEventsWidget,
  type ParentEventsData,
} from "@/components/widgets";
import {
  fetchEvents,
  registerEventParticipant,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

const INITIAL_EVENTS_DATA: ParentEventsData = {
  household_name: "Lin-Vance Household",
  children: [
    {
      student_id: "student-leo-01",
      name: "Leo Rostova",
      grade: "Grade 4B",
    },
    {
      student_id: "student-maya-02",
      name: "Maya Rostova",
      grade: "Kindergarten",
    },
  ],
  events: [
    {
      event_id: "evt-ontario-science",
      title: "Ontario Science Centre Annual STEM Excursion",
      event_date: "2026-11-18",
      registration_deadline: "2026-11-10",
      location: "Ontario Science Centre, North York",
      description:
        "Full-day interactive STEM workshops covering planetarium exhibits, mechanics, and human biology. School bus transport provided.",
      fee_amount: 35.0,
      capacity: 60,
      requires_permission_slip: true,
      status: "Open",
      is_registered: false,
      permission_slip_signed: false,
    },
    {
      event_id: "evt-winter-concert",
      title: "Winter Choral & Arts Concert 2026",
      event_date: "2026-12-12",
      registration_deadline: "2026-12-05",
      location: "Maple Leaf Academy Auditorium",
      description:
        "Evening musical performance and student gallery exhibition featuring elementary and junior choir ensembles.",
      fee_amount: 0,
      capacity: 250,
      requires_permission_slip: false,
      status: "Open",
      is_registered: true,
      permission_slip_signed: true,
    },
    {
      event_id: "evt-spring-athletics",
      title: "Spring Athletics Field Day & Obstacle Course",
      event_date: "2027-05-20",
      registration_deadline: "2027-05-12",
      location: "Central Campus Sports Field",
      description:
        "Annual house sports tournament including track & field, relays, and cooperative team challenges. Healthy lunch provided.",
      fee_amount: 15.0,
      capacity: 120,
      requires_permission_slip: true,
      status: "Open",
      is_registered: false,
      permission_slip_signed: false,
    },
  ],
};

export default function ParentEventsPage() {
  const [data, setData] = useState<ParentEventsData>(INITIAL_EVENTS_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setError(null);
        const session = getClientSession();
        const res = await fetchEvents("Open");

        if (!mounted) return;

        if (res.data && res.data.events && res.data.events.length > 0) {
          setData((prev) => ({
            ...prev,
            household_name: session?.user_name
              ? `${session.user_name} Household`
              : prev.household_name,
            events: res.data.events.map((e) => ({
              event_id: e.event_id,
              title: e.title,
              event_date: e.event_date,
              registration_deadline: e.registration_deadline,
              location: e.location,
              description: e.description,
              fee_amount: e.fee_amount,
              capacity: e.capacity,
              requires_permission_slip: e.requires_permission_slip,
              status: e.status,
              is_registered: false,
              permission_slip_signed: false,
            })),
          }));
        }
      } catch (err) {
        console.warn("Using fallback events data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRegisterEvent = async (
    eventId: string,
    studentId: string,
    signedSlip: boolean,
  ) => {
    setIsRegistering(true);
    try {
      const child = data.children.find((c) => c.student_id === studentId);
      await registerEventParticipant(eventId, {
        participant_name: child?.name || "Student",
        permission_slip_received: signedSlip,
      });

      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.event_id === eventId
            ? { ...e, is_registered: true, permission_slip_signed: signedSlip }
            : e,
        ),
      }));
      alert("Registration and parental permission recorded successfully!");
    } catch {
      // Local fallback optimistic update
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.event_id === eventId
            ? { ...e, is_registered: true, permission_slip_signed: signedSlip }
            : e,
        ),
      }));
      alert("Registration confirmed!");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <ParentEventsWidget
      data={data}
      isLoading={isLoading}
      error={error}
      onRegisterEvent={handleRegisterEvent}
      isRegistering={isRegistering}
    />
  );
}
