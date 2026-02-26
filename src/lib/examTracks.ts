import { CategoryCode, ExamTrack } from "@prisma/client";

export const EXAM_TRACKS: { id: ExamTrack; label: string; shortLabel: string }[] = [
  { id: "RSC", label: "Registered Cardiac Sonographer (RSC)", shortLabel: "RSC" },
  { id: "ACS", label: "Advanced Cardiac Sonographer (ACS)", shortLabel: "ACS" },
];

export function getExamTrackLabel(track: ExamTrack) {
  return EXAM_TRACKS.find((item) => item.id === track)?.label ?? track;
}

export const CATEGORY_LABELS_BY_TRACK: Record<ExamTrack, Record<CategoryCode, string>> = {
  RSC: {
    A: "Patient Care / Non-Imaging",
    B: "Imaging / Acquisition",
    C: "Valves",
    D: "Anatomy / Physiology / Hemodynamics / Pathology",
    E: "Physics / Instrumentation",
  },
  ACS: {
    A: "Disease & Clinical Integration",
    B: "Advanced / Structural Imaging",
    C: "Valvular Heart Disease",
    D: "Right Heart / Congenital / Hemodynamics",
    E: "Quality, Safety, and Lab Operations",
  },
};

export function getCategoryLabels(track: ExamTrack) {
  return CATEGORY_LABELS_BY_TRACK[track];
}
