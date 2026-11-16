import type { Metadata } from "next";
import { lessonById, lessons } from "@/catalog";
import { LockedLesson } from "@/platform/LockedLesson";
import { LessonPage } from "./LessonPage";

type Props = { params: Promise<{ moduleId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map(({ id }) => ({ moduleId: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = lessonById((await params).moduleId);
  return { title: `${lesson?.title} · Neural Atlas` };
}

export default async function LearnPage({ params }: Props) {
  const lesson = lessonById((await params).moduleId);
  if (!lesson) return null;
  if (lesson.load) return <LessonPage id={lesson.id} />;
  const prerequisites = lesson.prerequisites.flatMap((id) => lessonById(id) ?? []);
  return <LockedLesson lesson={lesson} prerequisites={prerequisites} />;
}
